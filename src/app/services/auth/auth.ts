/**
 * Authentication Service
 * 
 * Handles auto-login for the Experience Center app.
 * Uses service credentials to authenticate and fetch data.
 * 
 * @fileoverview Authentication service functions
 */

import { api, setAccessToken, setRefreshToken, clearTokens } from "@/app/utils/api";
import { getStoredValue, removeStoredValue, setStoredValue, type StorageKey } from "@/lib/storage";

// ===========================================
// Types
// ===========================================

interface LoginResponseData {
  user_id: number;
  email: string;
  org_id: number | null;
  full_name: string;
  telephone: string | null;
  site_ids: number[];
  site_name?: string | null;
  org_name: string | null;
  user_address: string | null;
  login_site_id?: number | null;
  login_status?: string | null;
  access_token: string;
  refresh_token?: string | null;
  session_id: string;
  message?: string;
}

interface ApiResponse<T> {
  status: "success" | "error" | "fail";
  message?: string;
  data: T;
}

// ===========================================
// Service Credentials
// ===========================================

const SERVICE_CREDENTIALS = {
  email: process.env.NEXT_PUBLIC_SERVICE_EMAIL || "dev@intellobots.com",
  password: process.env.NEXT_PUBLIC_SERVICE_PASSWORD || "intellobots123",
};

// ===========================================
// Auth State
// ===========================================

let isAuthenticated = false;
let isAuthenticating = false;
let authPromise: Promise<boolean> | null = null;

// ===========================================
// Auth Functions
// ===========================================

/**
 * Login with service credentials
 * Returns true if login successful, false otherwise
 */
async function login(): Promise<boolean> {
  // If already authenticated, return true
  if (isAuthenticated && getStoredValue("access_token")) {
    if (process.env.NODE_ENV === "development") console.log("✅ Already authenticated");
    return true;
  }

  // If currently authenticating, wait for the existing promise
  if (isAuthenticating && authPromise) {
    return authPromise;
  }

  isAuthenticating = true;
  
  authPromise = (async () => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("🔐 Attempting auto-login for Experience Center...");
      }
      
      const res = await api.post<ApiResponse<LoginResponseData>>(
        "v1/user/login/v2",
        SERVICE_CREDENTIALS
      );

      const apiResponse = res?.data;
      const resData = apiResponse?.data;

      if (!apiResponse || apiResponse.status !== "success" || !resData) {
        console.error("❌ Login failed:", apiResponse?.message);
        isAuthenticated = false;
        return false;
      }

      // Store tokens
      setAccessToken(resData.access_token);
      if (resData.refresh_token) {
        setRefreshToken(resData.refresh_token);
      }

      // Store user data in localStorage
      const storeIfExists = (key: StorageKey, value: unknown) => {
        if (value !== undefined && value !== null) {
          setStoredValue(key, String(value));
        }
      };

      storeIfExists("email", resData.email);
      storeIfExists("full_name", resData.full_name);
      storeIfExists("org_id", resData.org_id);
      storeIfExists("org_name", resData.org_name);
      storeIfExists("user_address", resData.user_address);
      if (resData.refresh_token) {
        storeIfExists("refresh_token", resData.refresh_token);
      }
      storeIfExists("access_token", resData.access_token);
      storeIfExists("user_id", resData.user_id);
      storeIfExists("telephone", resData.telephone);
      storeIfExists("site_name", resData.site_name);
      storeIfExists("login_site_id", resData.login_site_id);
      storeIfExists("login_status", resData.login_status);
      storeIfExists("session_id", resData.session_id);

      const resolvedSiteId =
        resData.login_site_id ??
        (resData.site_ids && resData.site_ids.length > 0 ? resData.site_ids[0] : 1);
      storeIfExists("site_id", resolvedSiteId);

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Auto-login successful for Experience Center");
        console.log("📍 Site ID:", resolvedSiteId);
      }
      
      isAuthenticated = true;
      return true;
    } catch (error) {
      console.error("❌ Auto-login error:", error);
      isAuthenticated = false;
      return false;
    } finally {
      isAuthenticating = false;
    }
  })();

  return authPromise;
}

/**
 * Check if user is authenticated
 */
function checkAuth(): boolean {
  const token = getStoredValue("access_token");
  isAuthenticated = !!token;
  return isAuthenticated;
}

/**
 * Logout and clear all tokens
 */
async function logout(): Promise<void> {
  try {
    const accessToken = getStoredValue("access_token");
    
    if (accessToken) {
      try {
        await api.post("/v1/user/logout", {
          access_token: accessToken,
        });
      } catch {
        console.warn("⚠️ Logout API call failed");
      }
    }

    // Clear localStorage
    const keysToRemove = [
      "email", "full_name", "org_id", "org_name", "user_address",
      "refresh_token", "access_token", "user_id", "telephone",
      "site_id", "login_site_id", "site_name", "login_status",
      "session_id", "setup_completed",
    ];

    keysToRemove.forEach((key) => removeStoredValue(key as StorageKey));
    clearTokens();
    
    isAuthenticated = false;
    if (process.env.NODE_ENV === "development") console.log("✅ Logged out successfully");
  } catch (error) {
    console.error("❌ Logout error:", error);
    clearTokens();
    isAuthenticated = false;
  }
}

/**
 * Ensure user is authenticated before making API calls
 * Call this before any protected API calls
 */
async function ensureAuth(): Promise<boolean> {
  if (checkAuth()) {
    return true;
  }
  return login();
}

/**
 * Get authentication status
 */
function getAuthStatus(): { isAuthenticated: boolean; isAuthenticating: boolean } {
  return { isAuthenticated, isAuthenticating };
}

export {
  login,
  logout,
  checkAuth,
  ensureAuth,
  getAuthStatus,
};
