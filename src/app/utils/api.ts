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
  typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

export const setAccessToken = (token: string) => {
  accessToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", token);
  }
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const setRefreshToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("refresh_token", token);
  }
};

export const clearTokens = () => {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
  delete api.defaults.headers.common["Authorization"];
};

export const handleLogout = () => {
  clearTokens();
  // For this kiosk-style app, silently re-authenticate instead of redirecting
  // to the landing page. Dynamic import avoids circular dependency with auth.ts.
  if (typeof window !== "undefined") {
    import("@/app/services/auth/auth").then(({ login }) => login()).catch(() => {
      console.error("❌ Silent re-login failed after token refresh failure");
    });
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
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

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

      try {
        const refreshPayload = refreshToken ? { refresh: refreshToken } : {};
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/v1/user/token-refresh`,
          refreshPayload,
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
          localStorage.setItem("reasonLogout", "access token expired");
          handleLogout();
          return Promise.reject(error);
        }

        setAccessToken(newAccessToken);
        if (newRefreshToken) setRefreshToken(newRefreshToken);

        // Retry queued requests
        failedQueue.forEach((prom) => {
          prom.originalRequest.headers = {
            ...(prom.originalRequest.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          };
          prom.resolve(api(prom.originalRequest));
        });
        failedQueue = [];

        // Retry original request
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        const safeError = serializeAxiosError(refreshError);
        localStorage.setItem("last_refresh_error", JSON.stringify(safeError));
        localStorage.setItem("reasonLogout", "token refresh failed");

        failedQueue.forEach((prom) => prom.reject(refreshError));
        failedQueue = [];

        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { api };
