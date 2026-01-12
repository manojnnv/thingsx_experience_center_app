/**
 * Device Configuration
 * 
 * Add the TINs of devices you want to display in the Experience Center.
 * Only devices listed here will be shown, even if the API returns more.
 */

// ===========================================
// SENSORS & ENDNODES EXPERIENCE
// ===========================================

export interface DeviceConfig {
  tin: string;
  displayName?: string;
  category?: string;
}

export interface SensorConfig {
  tin: string;
  displayName: string;
  category: string;
}

export interface EndnodeConfig {
  tin: string;
  displayName: string;
}

/**
 * The central Endnode for topology visualization
 * All sensors connect to this single endnode
 */
export const centralEndnode: EndnodeConfig = {
  // TODO: Replace with your real endnode TIN
  tin: "ENDNODE-001",
  displayName: "ThingsX Endnode",
};

/**
 * Sensor Device TINs
 * All sensors connect to the central endnode
 */
export const sensorsDeviceTins: SensorConfig[] = [
  // TODO: Replace with your real sensor TINs
  { tin: "SENSOR-001", displayName: "Temperature Sensor 1", category: "temperature" },
  { tin: "SENSOR-002", displayName: "Humidity Sensor 1", category: "humidity" },
  { tin: "SENSOR-003", displayName: "Motion Detector 1", category: "motion" },
  { tin: "SENSOR-004", displayName: "Light Sensor 1", category: "light" },
  { tin: "SENSOR-005", displayName: "Pressure Sensor 1", category: "pressure" },
  { tin: "SENSOR-006", displayName: "Air Quality Monitor", category: "air_quality" },
  { tin: "SENSOR-007", displayName: "Temperature Sensor 2", category: "temperature" },
  { tin: "SENSOR-008", displayName: "Humidity Sensor 2", category: "humidity" },
];

// ===========================================
// EPD (E-PAPER DISPLAY) CONFIGURATION
// For Sensors & Endnodes Experience
// ===========================================

export type EPDColor = "black" | "red" | "yellow" | "white";
export type EPDSize = "small" | "medium" | "large";

export interface EPDConfig {
  tin: string;
  displayName: string;
  size: EPDSize;
  color: EPDColor;
  width: number;  // in pixels
  height: number; // in pixels
  fields: EPDFieldConfig[]; // Editable fields on this EPD
}

export interface EPDFieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "price" | "date";
  defaultValue?: string | number;
}

/**
 * Demo EPD Devices for Sensors & Endnodes Experience
 * These are displayed with different colors and sizes
 */
export const sensorEPDDevices: EPDConfig[] = [
  // TODO: Replace with your real EPD TINs
  {
    tin: "EPD-SENSOR-001",
    displayName: "Demo EPD Small Black",
    size: "small",
    color: "black",
    width: 152,
    height: 152,
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Sensor Data" },
      { key: "value", label: "Value", type: "number", defaultValue: 0 },
      { key: "unit", label: "Unit", type: "text", defaultValue: "°C" },
    ],
  },
  {
    tin: "EPD-SENSOR-002",
    displayName: "Demo EPD Medium Red",
    size: "medium",
    color: "red",
    width: 296,
    height: 152,
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Status" },
      { key: "status", label: "Status", type: "text", defaultValue: "Active" },
      { key: "timestamp", label: "Last Update", type: "text", defaultValue: "--" },
    ],
  },
  {
    tin: "EPD-SENSOR-003",
    displayName: "Demo EPD Large Yellow",
    size: "large",
    color: "yellow",
    width: 400,
    height: 300,
    fields: [
      { key: "header", label: "Header", type: "text", defaultValue: "Dashboard" },
      { key: "metric1", label: "Metric 1", type: "number", defaultValue: 0 },
      { key: "metric2", label: "Metric 2", type: "number", defaultValue: 0 },
      { key: "message", label: "Message", type: "text", defaultValue: "Welcome" },
    ],
  },
  {
    tin: "EPD-SENSOR-004",
    displayName: "Demo EPD Small White",
    size: "small",
    color: "white",
    width: 152,
    height: 152,
    fields: [
      { key: "label", label: "Label", type: "text", defaultValue: "Item" },
      { key: "count", label: "Count", type: "number", defaultValue: 0 },
    ],
  },
];

// ===========================================
// ESL (ELECTRONIC SHELF LABEL) CONFIGURATION
// For Retail Experience
// ===========================================

export interface ESLConfig {
  tin: string;
  displayName: string;
  size: EPDSize;
  color: EPDColor;
  width: number;
  height: number;
  productFields: ESLFieldConfig[];
}

export interface ESLFieldConfig {
  key: string;
  label: string;
  type: "text" | "price" | "barcode" | "qr";
  defaultValue?: string | number;
}

/**
 * ESL Devices for Retail Experience
 */
export const retailESLDevices: ESLConfig[] = [
  // TODO: Replace with your real ESL TINs
  {
    tin: "ESL-RETAIL-001",
    displayName: "Shelf Label 1",
    size: "small",
    color: "black",
    width: 152,
    height: 152,
    productFields: [
      { key: "product_name", label: "Product Name", type: "text", defaultValue: "Product" },
      { key: "price", label: "Price", type: "price", defaultValue: "0.00" },
      { key: "sku", label: "SKU", type: "text", defaultValue: "SKU-000" },
    ],
  },
  {
    tin: "ESL-RETAIL-002",
    displayName: "Shelf Label 2",
    size: "medium",
    color: "red",
    width: 296,
    height: 152,
    productFields: [
      { key: "product_name", label: "Product Name", type: "text", defaultValue: "Product" },
      { key: "price", label: "Price", type: "price", defaultValue: "0.00" },
      { key: "discount", label: "Discount", type: "text", defaultValue: "" },
      { key: "barcode", label: "Barcode", type: "barcode", defaultValue: "0000000000" },
    ],
  },
  {
    tin: "ESL-RETAIL-003",
    displayName: "Shelf Label 3",
    size: "large",
    color: "yellow",
    width: 400,
    height: 300,
    productFields: [
      { key: "product_name", label: "Product Name", type: "text", defaultValue: "Featured Product" },
      { key: "description", label: "Description", type: "text", defaultValue: "" },
      { key: "price", label: "Price", type: "price", defaultValue: "0.00" },
      { key: "original_price", label: "Original Price", type: "price", defaultValue: "" },
      { key: "promo", label: "Promo Text", type: "text", defaultValue: "SALE" },
    ],
  },
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export const getSensorTins = (): string[] => sensorsDeviceTins.map((d) => d.tin);
export const getSensorEPDTins = (): string[] => sensorEPDDevices.map((d) => d.tin);
export const getRetailESLTins = (): string[] => retailESLDevices.map((d) => d.tin);

/**
 * Sensor category display configuration
 */
export const categoryConfig: Record<string, { label: string; unit: string; icon: string }> = {
  temperature: { label: "Temperature", unit: "°C", icon: "thermometer" },
  humidity: { label: "Humidity", unit: "%", icon: "droplet" },
  motion: { label: "Motion", unit: "", icon: "activity" },
  light: { label: "Light", unit: "lux", icon: "sun" },
  pressure: { label: "Pressure", unit: "hPa", icon: "gauge" },
  air_quality: { label: "Air Quality", unit: "AQI", icon: "wind" },
};

/**
 * EPD color mapping to actual display colors
 */
export const epdColorMap: Record<EPDColor, { bg: string; text: string; accent: string }> = {
  black: { bg: "#1a1a1a", text: "#ffffff", accent: "#333333" },
  red: { bg: "#1a1a1a", text: "#ff4444", accent: "#ff6666" },
  yellow: { bg: "#1a1a1a", text: "#ffd700", accent: "#ffeb3b" },
  white: { bg: "#f5f5f5", text: "#1a1a1a", accent: "#666666" },
};

/**
 * EPD size dimensions
 */
export const epdSizeMap: Record<EPDSize, { width: number; height: number; scale: number }> = {
  small: { width: 152, height: 152, scale: 1 },
  medium: { width: 296, height: 152, scale: 1.2 },
  large: { width: 400, height: 300, scale: 1.5 },
};
