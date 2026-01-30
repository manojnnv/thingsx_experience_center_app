export type DisplayDevice = {
  tin: string;
  name: string;
  type: string;
  category: string;
  status: "online" | "offline";
  lastReading: number | null;
  lastReceivedAt?: Date | null;
  unit: string;
};

export type SensorLiveData = {
  tin: string;
  value: number;
  unit: string;
  displayName: string;
  category: string;
  lastReceivedAt: Date;
  history: number[];
};

export type EPDFieldValues = {
  [tin: string]: {
    [fieldKey: string]: string | number;
  };
};
