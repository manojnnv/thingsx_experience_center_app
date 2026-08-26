/** IANA timezone for Indian Standard Time (UTC+05:30, no DST). */
export const IST_TIME_ZONE = "Asia/Kolkata";

type DateTimeSettings = {
  timeZone?: string;
  dateFormat?: string;
  timeFormat?: "12-hour" | "24-hour";
};

const HAS_EXPLICIT_OFFSET = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * Parse an API timestamp that is known to be UTC.
 * Naive strings (no Z / offset) are treated as UTC, not local time.
 */
export const parseUtcTimestamp = (utcTime: string): Date => {
  const trimmed = String(utcTime).trim();
  if (!trimmed) return new Date(NaN);
  if (HAS_EXPLICIT_OFFSET.test(trimmed)) {
    return new Date(trimmed);
  }
  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return new Date(`${iso}Z`);
};

const readSettings = (): DateTimeSettings => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("globalDateTimeSettings");
    return raw ? (JSON.parse(raw) as DateTimeSettings) : {};
  } catch {
    return {};
  }
};

const getParts = (utcTime: string, timeZone: string, hour12: boolean) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  });

  const parts = formatter.formatToParts(parseUtcTimestamp(utcTime));
  const map = new Map(parts.map((p) => [p.type, p.value]));
  return {
    day: map.get("day") || "",
    month: map.get("month") || "",
    year: map.get("year") || "",
    hour: map.get("hour") || "",
    minute: map.get("minute") || "",
    dayPeriod: map.get("dayPeriod") || "",
  };
};

const formatDate = (
  parts: ReturnType<typeof getParts>,
  dateFormat: string
) => {
  switch (dateFormat) {
    case "MM/DD/YYYY":
      return `${parts.month}/${parts.day}/${parts.year}`;
    case "YYYY/MM/DD":
      return `${parts.year}/${parts.month}/${parts.day}`;
    case "YYYY-MM-DD":
      return `${parts.year}-${parts.month}-${parts.day}`;
    default:
      return `${parts.day}/${parts.month}/${parts.year}`;
  }
};

const formatTime = (parts: ReturnType<typeof getParts>, hour12: boolean) => {
  if (hour12) {
    return `${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
  }
  return `${parts.hour}:${parts.minute}`;
};

export const formatDateAndTime = (dates: Date[]): string[] => {
  if (!dates) return [];
  return dates.map((date) => {
    if (!date) return "";
    const utcDate = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
    );
    return utcDate.toISOString();
  });
};

export const formatDateTime = (utcTime: string, timeOnly = false) => {
  if (!utcTime) return "";
  const settings = readSettings();
  const timeZone = settings.timeZone || "Etc/UTC";
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const hour12 = settings.timeFormat === "12-hour";

  const parts = getParts(utcTime, timeZone, hour12);
  if (timeOnly) {
    return formatTime(parts, hour12);
  }

  return `${formatDate(parts, dateFormat)} ${formatTime(parts, hour12)}`;
};

const formatInIst = (
  utcTime: string,
  options: Intl.DateTimeFormatOptions
): string => {
  if (!utcTime) return "";
  const date = parseUtcTimestamp(utcTime);
  if (Number.isNaN(date.getTime())) return utcTime;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    ...options,
  }).format(date);
};

/** Short date in IST, e.g. "26 Aug". */
export const formatIstDate = (utcTime: string): string =>
  formatInIst(utcTime, { month: "short", day: "numeric" });

/** Time in IST, e.g. "04:00 pm". */
export const formatIstTime = (utcTime: string): string =>
  formatInIst(utcTime, { hour: "2-digit", minute: "2-digit", hour12: true });

/** Date and time in IST, e.g. "26 Aug 2026, 04:00 pm". */
export const formatIstDateTime = (utcTime: string): string =>
  formatInIst(utcTime, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
