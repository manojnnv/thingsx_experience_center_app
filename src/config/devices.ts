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
  tin: "EN0001000020",
  displayName: "ThingsX Endnode",
};

/**
 * Sensor Device TINs
 * All sensors connect to the central endnode
 */
export const sensorsDeviceTins: SensorConfig[] = [
  { tin: "SN0013000004", displayName: "Temp Probe", category: "temperature" },
  { tin: "SN0002000001", displayName: "Accelerometer", category: "accelerometer" },
  { tin: "SN0006000001", displayName: "MQ2", category: "gas" },
  { tin: "SN0006000002", displayName: "MQ6", category: "gas" },
  { tin: "SN0001000010", displayName: "Temp (BME680)", category: "temperature" },
  { tin: "SN0011000001", displayName: "Current Clamp Type", category: "current" },
  { tin: "SN0007000002", displayName: "Light Intensity", category: "light" },
  { tin: "SN0031000001", displayName: "Magnetometer", category: "magnetometer" },
  { tin: "SN0008000002", displayName: "Relay- 1 ch", category: "relay" },
  { tin: "SN0020000001", displayName: "Relay- 2 ch", category: "relay" },
  { tin: "SN0009000001", displayName: "Relay- 4 ch", category: "relay" },
  { tin: "SN0005000001", displayName: "Rack-1 LED", category: "led" },
  { tin: "SN0005000002", displayName: "Rack-2 LED", category: "led" },
  { tin: "SN0005000003", displayName: "Rack-3 LED", category: "led" },
  { tin: "SN0003000003", displayName: "Rack-1 Load Cell", category: "load_cell" },
  { tin: "SN0003000004", displayName: "Rack-2 Load Cell", category: "load_cell" },
  { tin: "SN0003000001", displayName: "Rack-3 Load Cell", category: "load_cell" },
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
  templateId?: number;
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
 * ESL Devices for Retail Experience (12 ESLs as per requirement)
 */
export const retailESLDevices: ESLConfig[] = [
  // TODO: Replace with your real ESL TINs
  // Row 1 - Top Shelf
  { tin: "ESL-RETAIL-001", displayName: "Shelf 1 - Label 1", size: "small", color: "black", width: 152, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Organic Almonds" },
    { key: "price", label: "Price", type: "price", defaultValue: "12.99" },
    { key: "sku", label: "SKU", type: "text", defaultValue: "ALM-001" },
  ]},
  { tin: "ESL-RETAIL-002", displayName: "Shelf 1 - Label 2", size: "small", color: "black", width: 152, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Greek Yogurt" },
    { key: "price", label: "Price", type: "price", defaultValue: "4.99" },
    { key: "sku", label: "SKU", type: "text", defaultValue: "YOG-002" },
  ]},
  { tin: "ESL-RETAIL-003", displayName: "Shelf 1 - Label 3", size: "small", color: "red", width: 152, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Energy Bars" },
    { key: "price", label: "Price", type: "price", defaultValue: "2.49" },
    { key: "sku", label: "SKU", type: "text", defaultValue: "BAR-003" },
  ]},
  { tin: "ESL-RETAIL-004", displayName: "Shelf 1 - Label 4", size: "small", color: "black", width: 152, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Coconut Water" },
    { key: "price", label: "Price", type: "price", defaultValue: "3.49" },
    { key: "sku", label: "SKU", type: "text", defaultValue: "COC-004" },
  ]},
  // Row 2 - Middle Shelf
  { tin: "ESL-RETAIL-005", displayName: "Shelf 2 - Label 1", size: "medium", color: "yellow", width: 296, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Premium Coffee" },
    { key: "price", label: "Price", type: "price", defaultValue: "18.99" },
    { key: "original_price", label: "Original Price", type: "price", defaultValue: "24.99" },
    { key: "promo", label: "Promo", type: "text", defaultValue: "25% OFF" },
  ]},
  { tin: "ESL-RETAIL-006", displayName: "Shelf 2 - Label 2", size: "medium", color: "black", width: 296, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Green Tea" },
    { key: "price", label: "Price", type: "price", defaultValue: "8.99" },
    { key: "description", label: "Description", type: "text", defaultValue: "100 bags" },
  ]},
  { tin: "ESL-RETAIL-007", displayName: "Shelf 2 - Label 3", size: "medium", color: "red", width: 296, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Protein Powder" },
    { key: "price", label: "Price", type: "price", defaultValue: "29.99" },
    { key: "promo", label: "Promo", type: "text", defaultValue: "NEW!" },
  ]},
  { tin: "ESL-RETAIL-008", displayName: "Shelf 2 - Label 4", size: "medium", color: "black", width: 296, height: 152, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Honey" },
    { key: "price", label: "Price", type: "price", defaultValue: "7.49" },
    { key: "description", label: "Description", type: "text", defaultValue: "Raw & Organic" },
  ]},
  // Row 3 - Bottom Shelf
  { tin: "ESL-RETAIL-009", displayName: "Shelf 3 - Label 1", size: "large", color: "yellow", width: 400, height: 300, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Vitamin Bundle" },
    { key: "description", label: "Description", type: "text", defaultValue: "Complete daily nutrition" },
    { key: "price", label: "Price", type: "price", defaultValue: "34.99" },
    { key: "original_price", label: "Original Price", type: "price", defaultValue: "49.99" },
    { key: "promo", label: "Promo", type: "text", defaultValue: "BEST SELLER" },
  ]},
  { tin: "ESL-RETAIL-010", displayName: "Shelf 3 - Label 2", size: "large", color: "black", width: 400, height: 300, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Omega-3 Fish Oil" },
    { key: "description", label: "Description", type: "text", defaultValue: "Heart health support" },
    { key: "price", label: "Price", type: "price", defaultValue: "19.99" },
  ]},
  { tin: "ESL-RETAIL-011", displayName: "Shelf 3 - Label 3", size: "large", color: "red", width: 400, height: 300, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Multivitamin Pack" },
    { key: "description", label: "Description", type: "text", defaultValue: "30 day supply" },
    { key: "price", label: "Price", type: "price", defaultValue: "24.99" },
    { key: "promo", label: "Promo", type: "text", defaultValue: "BUY 2 GET 1" },
  ]},
  { tin: "ESL-RETAIL-012", displayName: "Shelf 3 - Label 4", size: "large", color: "black", width: 400, height: 300, productFields: [
    { key: "product_name", label: "Product Name", type: "text", defaultValue: "Probiotic Blend" },
    { key: "description", label: "Description", type: "text", defaultValue: "Digestive wellness" },
    { key: "price", label: "Price", type: "price", defaultValue: "27.99" },
  ]},
];

// ===========================================
// LED STRIP CONFIGURATION
// For Smart Shelf Lighting
// ===========================================

export interface LEDStripConfig {
  tin: string;
  displayName: string;
  shelfPosition: "top" | "middle" | "bottom";
  defaultColor: string;
  defaultBrightness: number;
}

/**
 * LED Strip devices for shelf lighting
 */
export const retailLEDStrips: LEDStripConfig[] = [
  // TODO: Replace with your real LED TINs
  { tin: "LED-SHELF-001", displayName: "Top Shelf LED", shelfPosition: "top", defaultColor: "#ffffff", defaultBrightness: 80 },
  { tin: "LED-SHELF-002", displayName: "Middle Shelf LED", shelfPosition: "middle", defaultColor: "#ffffff", defaultBrightness: 80 },
  { tin: "LED-SHELF-003", displayName: "Bottom Shelf LED", shelfPosition: "bottom", defaultColor: "#ffffff", defaultBrightness: 80 },
];

// ===========================================
// LOAD CELL CONFIGURATION
// For Stock Sensing
// ===========================================

export interface LoadCellConfig {
  tin: string;
  displayName: string;
  shelfPosition: "top" | "middle" | "bottom";
  slotIndex: number;
  maxWeight: number; // in grams
  productWeight: number; // weight per unit in grams
}

/**
 * Load cell devices for stock sensing
 */
export const retailLoadCells: LoadCellConfig[] = [
  // TODO: Replace with your real Load Cell TINs
  { tin: "LOAD-001", displayName: "Slot 1", shelfPosition: "top", slotIndex: 1, maxWeight: 2000, productWeight: 250 },
  { tin: "LOAD-002", displayName: "Slot 2", shelfPosition: "top", slotIndex: 2, maxWeight: 2000, productWeight: 150 },
  { tin: "LOAD-003", displayName: "Slot 3", shelfPosition: "top", slotIndex: 3, maxWeight: 2000, productWeight: 60 },
  { tin: "LOAD-004", displayName: "Slot 4", shelfPosition: "top", slotIndex: 4, maxWeight: 2000, productWeight: 330 },
  { tin: "LOAD-005", displayName: "Slot 5", shelfPosition: "middle", slotIndex: 1, maxWeight: 3000, productWeight: 400 },
  { tin: "LOAD-006", displayName: "Slot 6", shelfPosition: "middle", slotIndex: 2, maxWeight: 3000, productWeight: 200 },
  { tin: "LOAD-007", displayName: "Slot 7", shelfPosition: "middle", slotIndex: 3, maxWeight: 3000, productWeight: 500 },
  { tin: "LOAD-008", displayName: "Slot 8", shelfPosition: "middle", slotIndex: 4, maxWeight: 3000, productWeight: 450 },
];

// ===========================================
// COMPUTER VISION / CAMERA CONFIGURATION
// ===========================================

export interface CameraConfig {
  tin: string;
  displayName: string;
  zone: string;
  capabilities: ("demographics" | "tracking" | "interaction" | "attendance")[];
}

/**
 * Camera devices for computer vision
 */
export const retailCameras: CameraConfig[] = [
  // TODO: Replace with your real Camera TINs
  { tin: "CAM-RETAIL-001", displayName: "Store Entrance Camera", zone: "entrance", capabilities: ["demographics", "tracking", "attendance"] },
  { tin: "CAM-RETAIL-002", displayName: "Shelf Aisle Camera", zone: "aisle", capabilities: ["demographics", "tracking", "interaction"] },
  { tin: "CAM-RETAIL-003", displayName: "Checkout Camera", zone: "checkout", capabilities: ["demographics", "tracking"] },
];

// ===========================================
// RACK SCREEN CONFIGURATION
// For Triggered Marketing
// ===========================================

export interface RackScreenConfig {
  tin: string;
  displayName: string;
  zone: string;
  width: number;
  height: number;
}

/**
 * Rack screen devices for triggered marketing
 */
export const retailRackScreens: RackScreenConfig[] = [
  // TODO: Replace with your real Rack Screen TINs
  { tin: "SCREEN-001", displayName: "Aisle 1 Display", zone: "aisle_1", width: 1920, height: 1080 },
  { tin: "SCREEN-002", displayName: "Aisle 2 Display", zone: "aisle_2", width: 1920, height: 1080 },
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export const getSensorTins = (): string[] => sensorsDeviceTins.map((d) => d.tin);
export const getSensorEPDTins = (): string[] => sensorEPDDevices.map((d) => d.tin);
export const getRetailESLTins = (): string[] => retailESLDevices.map((d) => d.tin);
export const getRetailLEDTins = (): string[] => retailLEDStrips.map((d) => d.tin);
export const getRetailLoadCellTins = (): string[] => retailLoadCells.map((d) => d.tin);
export const getRetailCameraTins = (): string[] => retailCameras.map((d) => d.tin);
export const getRetailScreenTins = (): string[] => retailRackScreens.map((d) => d.tin);

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
  accelerometer: { label: "Accelerometer", unit: "m/s²", icon: "activity" },
  gas: { label: "Gas", unit: "ppm", icon: "wind" },
  current: { label: "Current", unit: "A", icon: "zap" },
  magnetometer: { label: "Magnetometer", unit: "µT", icon: "compass" },
  relay: { label: "Relay", unit: "state", icon: "toggle-right" },
  led: { label: "LED", unit: "", icon: "sun" },
  load_cell: { label: "Load Cell", unit: "kg", icon: "scale" },
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
