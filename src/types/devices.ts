/**
 * Device Type Definitions
 */

export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'error';

export type DeviceType = 
  | 'sensor' 
  | 'camera' 
  | 'gateway' 
  | 'actuator' 
  | 'display' 
  | 'controller';

export interface DeviceLocation {
  x: number;
  y: number;
  z?: number;
  floor?: string;
  zone?: string;
}

export interface DeviceMetadata {
  manufacturer?: string;
  model?: string;
  firmware?: string;
  serialNumber?: string;
  installDate?: string;
  lastMaintenance?: string;
  [key: string]: unknown;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  location: DeviceLocation;
  metadata?: DeviceMetadata;
  createdAt: string;
  updatedAt: string;
  lastSeen?: string;
}

export interface DeviceReading {
  deviceId: string;
  timestamp: string;
  type: string;
  value: number | string | boolean;
  unit?: string;
}
