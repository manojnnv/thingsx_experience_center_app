/**
 * API Client Configuration
 * Axios-based API client with token management
 * Based on thingsx_ui_v2 implementation
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";
import { getStoredValue, removeStoredValue, setStoredValue } from "@/lib/storage";

// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://tgx-app-api.sit.intellobots.com";

// Serialize Axios error for debugging
function serializeAxiosError(error: unknown) {
  if (!isAxiosError(error)) {
    return { message: error instanceof Error ? error.message : "Unknown error" };
  }

  return {
    message: error.message,
    name: error.name,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
    },
    response: error.response
      ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      }
      : null,
    code: error.code,
  };
}

// Access token in memory
let accessToken: string | null =
  typeof window !== "undefined" ? getStoredValue("access_token") || null : null;

export const setAccessToken = (token: string) => {
  accessToken = token;
  setStoredValue("access_token", token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const setRefreshToken = (token: string) => {
  setStoredValue("refresh_token", token);
};

export const clearTokens = () => {
  accessToken = null;
  removeStoredValue("access_token");
  removeStoredValue("refresh_token");
  delete api.defaults.headers.common["Authorization"];
};

export const handleLogout = async (): Promise<boolean> => {
  clearTokens();
  // For this kiosk-style app, silently re-authenticate instead of redirecting
  // to the landing page. Dynamic import avoids circular dependency with auth.ts.
  if (typeof window === "undefined") return false;
  try {
    const { login } = await import("@/app/services/auth/auth");
    return await login();
  } catch {
    console.error("❌ Silent re-login failed after token refresh failure");
    return false;
  }
};

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Queue for handling multiple requests during refresh
type QueueItem = {
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
  originalRequest: AxiosRequestConfig;
};
let failedQueue: QueueItem[] = [];
let isRefreshing = false;

// Response interceptor to handle 401 (refresh token) and 429 (rate limiting retry)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retry429Count?: number };
    const refreshToken = typeof window !== "undefined" ? getStoredValue("refresh_token") || null : null;

    // Handle 429 Too Many Requests with exponential backoff
    if (error.response?.status === 429 && originalRequest) {
      originalRequest._retry429Count = originalRequest._retry429Count || 0;
      if (originalRequest._retry429Count < 3) {
        originalRequest._retry429Count += 1;
        const retryAfter = error.response.headers?.["retry-after"];
        const delayMs = retryAfter
          ? (Number(retryAfter) || 1) * 1000
          : 400 * Math.pow(2, originalRequest._retry429Count);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return api(originalRequest);
      }
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined" &&
      !originalRequest.url?.includes("/login")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${token}`,
              };
              resolve(api(originalRequest));
            },
            reject,
            originalRequest,
          });
        });
      }

      isRefreshing = true;

      const retryAll = (token: string) => {
        failedQueue.forEach((prom) => {
          prom.originalRequest.headers = {
            ...(prom.originalRequest.headers || {}),
            Authorization: `Bearer ${token}`,
          };
          prom.resolve(api(prom.originalRequest));
        });
        failedQueue = [];
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${token}`,
        };
        return api(originalRequest);
      };

      const reloginAndRetry = async (reason: string) => {
        localStorage.setItem("reasonLogout", reason);
        const loggedIn = await handleLogout();
        if (loggedIn && accessToken) return retryAll(accessToken);
        failedQueue.forEach((prom) => prom.reject(error));
        failedQueue = [];
        return Promise.reject(error);
      };

      try {
        // Cookie-only refresh (`{}`) 400s when there is no session (e.g. localhost
        // without a login). Skip the POST and re-authenticate instead.
        if (!refreshToken) {
          return await reloginAndRetry("access token expired");
        }

        const refreshResponse = await axios.post(
          `${API_BASE_URL}/v1/user/token-refresh`,
          { refresh: refreshToken },
          { withCredentials: true }
        );

        const newAccessToken =
          refreshResponse.data?.access ||
          refreshResponse.data?.data?.access_token ||
          refreshResponse.data?.access_token;
        const newRefreshToken =
          refreshResponse.data?.refresh ||
          refreshResponse.data?.data?.refresh_token ||
          refreshResponse.data?.refresh_token;

        if (!newAccessToken) {
          return await reloginAndRetry("access token expired");
        }

        setAccessToken(newAccessToken);
        if (newRefreshToken) setRefreshToken(newRefreshToken);
        return retryAll(newAccessToken);
      } catch (refreshError) {
        const safeError = serializeAxiosError(refreshError);
        localStorage.setItem("last_refresh_error", JSON.stringify(safeError));
        return await reloginAndRetry("token refresh failed");
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { api };
