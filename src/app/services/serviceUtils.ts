export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
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
