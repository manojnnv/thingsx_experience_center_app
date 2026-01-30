type DateTimeSettings = {
  timeZone?: string;
  dateFormat?: string;
  timeFormat?: "12-hour" | "24-hour";
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

  const parts = formatter.formatToParts(new Date(utcTime));
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
