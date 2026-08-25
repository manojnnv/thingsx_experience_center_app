export type StorageKey =
  | "site_id"
  | "org_id"
  | "access_token"
  | "refresh_token"
  | "reasonLogout"
  | "last_refresh_error"
  | "email"
  | "full_name"
  | "org_name"
  | "user_address"
  | "user_id"
  | "telephone"
  | "site_name"
  | "login_site_id"
  | "login_status"
  | "session_id"
  | "setup_completed";

export function getStoredValue(key: StorageKey, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

export function setStoredValue(key: StorageKey, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

export function removeStoredValue(key: StorageKey): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}
