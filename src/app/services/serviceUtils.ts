import axios from "axios";

export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

export const isRequestCanceled = (error: unknown) => {
  if (axios.isCancel(error)) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error && typeof error === "object") {
    const e = error as { code?: string; name?: string };
    if (e.code === "ERR_CANCELED" || e.name === "CanceledError" || e.name === "AbortError") {
      return true;
    }
  }
  return false;
};

export const ok = <T>(data: T): ServiceResult<T> => ({
  data,
  error: null,
});

export const fail = <T>(message: string): ServiceResult<T> => ({
  data: null,
  error: message,
});

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    const message = response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
