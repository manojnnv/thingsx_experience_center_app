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
};

export type SensorLiveData = {
  tin: string;
  value: number;
  unit: string;
  displayName: string;
  category: string;
  lastReceivedAt: Date;
  history: number[];
  /** When sensor is Addressable RGB/LED, hex color for display */
  valueDisplay?: string;
};

export type EPDFieldValues = {
  [tin: string]: {
    [fieldKey: string]: string | number;
  };
};
