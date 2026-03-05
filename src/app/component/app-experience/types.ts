export type DisplayDevice = {
  tin: string;
  name: string;
  type: string;
  category: string;
  status: "online" | "offline";
  lastReading: number | null;
  lastReceivedAt?: Date | null;
  unit: string;
  /** When device is Addressable RGB/LED, hex color for display (from last reading) */
  lastReadingDisplay?: string;
  /** Icon from API (URL) or category icon key from config */
  icon?: string;
  /** Latest value per metric from Metrics API (e.g. roll, pitch) when no live data yet */
  fields?: Record<string, SensorLiveDataField>;
};

/** One metric from latest_data (value + optional timestamp) */
export type SensorLiveDataField = {
  value: number;
  timestamp?: string;
};

export type SensorLiveData = {
  tin: string;
  /** Latest reading; null when last reading was invalid (ghost). Use last-known-good from history in UI. */
  value: number | null;
  unit: string;
  displayName: string;
  category: string;
  lastReceivedAt: Date;
  /** Only valid readings; invalid ones are not appended so trends stay correct. */
  history: number[];
  /** When sensor is Addressable RGB/LED, hex color for display */
  valueDisplay?: string;
  /** All metrics returned by the API (metric key → value + timestamp). Primary value/unit are from the first. */
  fields?: Record<string, SensorLiveDataField>;
};

export type EPDFieldValues = {
  [tin: string]: {
    [fieldKey: string]: string | number;
  };
};
