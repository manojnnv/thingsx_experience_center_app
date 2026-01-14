/**
 * Retail Experience Services
 * 
 * Handles all API calls related to retail operations.
 * Includes LED control, ESL management, and load cell data.
 * 
 * @fileoverview Retail-related API service functions
 */

import { api } from "@/app/utils/api";
import { getSiteId } from "@/config/site";

// ===========================================
// Types
// ===========================================

export interface LEDControlPayload {
  tin: string;
  color: string;
  brightness: number;
  mode: "normal" | "sale" | "promo" | "highlight";
}

export interface LEDState {
  tin: string;
  color: string;
  brightness: number;
  isOn: boolean;
  mode: "normal" | "sale" | "promo" | "highlight";
}

export interface LoadCellReading {
  tin: string;
  currentWeight: number;
  maxWeight: number;
  stockLevel: number;
  lastInteraction: string | null;
  interactionCount: number;
}

export interface StockAlert {
  tin: string;
  productName: string;
  stockLevel: number;
  alertType: "low" | "critical" | "out_of_stock";
}

// ===========================================
// LED Control APIs
// ===========================================

/**
 * Update LED strip color and brightness
 */
async function updateLEDStrip(payload: LEDControlPayload): Promise<{ success: boolean; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/config/update", {
      tin: payload.tin,
      data: {
        color: payload.color,
        brightness: payload.brightness,
        mode: payload.mode,
      },
    });
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error updating LED strip:", error);
    return { success: false, error: "Failed to update LED" };
  }
}

/**
 * Toggle LED on/off
 */
async function toggleLEDPower(tin: string, isOn: boolean): Promise<{ success: boolean; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/config/update", {
      tin: tin,
      data: { power: isOn ? "on" : "off" },
    });
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error toggling LED power:", error);
    return { success: false, error: "Failed to toggle LED" };
  }
}

/**
 * Apply LED settings to multiple strips
 */
async function bulkUpdateLEDs(tins: string[], color: string, brightness: number, mode: LEDControlPayload["mode"]): Promise<{ success: boolean; error: string | null }> {
  try {
    const promises = tins.map((tin) =>
      api.post("/v1/device/config/update", {
        tin: tin,
        data: { color, brightness, mode },
      })
    );
    await Promise.all(promises);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error bulk updating LEDs:", error);
    return { success: false, error: "Failed to bulk update LEDs" };
  }
}

/**
 * Get current LED status
 */
async function getLEDStatus(tin: string): Promise<{ data: LEDState | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/config/get", {
      tin: tin,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error getting LED status:", error);
    return { data: null, error: "Failed to get LED status" };
  }
}

// ===========================================
// Load Cell / Stock APIs
// ===========================================

/**
 * Get load cell readings for stock monitoring
 */
async function getLoadCellReadings(tins: string[]): Promise<{ data: LoadCellReading[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/metrics", {
      site_id: getSiteId(),
      tins: tins,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error getting load cell readings:", error);
    return { data: null, error: "Failed to get load cell data" };
  }
}

/**
 * Get stock alerts for low inventory
 */
async function getStockAlerts(siteId: string): Promise<{ data: StockAlert[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/metrics/stock_alerts", {
      site_id: siteId || getSiteId(),
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error getting stock alerts:", error);
    return { data: null, error: "Failed to get stock alerts" };
  }
}

/**
 * Poll load cell data for real-time updates
 */
async function pollLoadCellData(tins: string[]): Promise<{ readings: LoadCellReading[]; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/metrics", {
      site_id: getSiteId(),
      tins: tins,
    });
    
    if (resp?.data?.data) {
      return { readings: resp.data.data, error: null };
    }
    return { readings: [], error: null };
  } catch (error) {
    console.error("Error polling load cell data:", error);
    return { readings: [], error: "Connection error. Retrying..." };
  }
}

// ===========================================
// Rack Screen / Marketing APIs
// ===========================================

/**
 * Push content to rack display screen
 */
async function pushToRackScreen(tin: string, content: { imageUrl?: string; message?: string; productId?: string }): Promise<{ success: boolean; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/display/update", {
      tin: tin,
      content: content,
    });
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error pushing to rack screen:", error);
    return { success: false, error: "Failed to update rack screen" };
  }
}

/**
 * Trigger marketing content based on interaction
 */
async function triggerMarketingContent(zone: string, productId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const resp = await api.post("/v1/marketing/trigger", {
      site_id: getSiteId(),
      zone: zone,
      product_id: productId,
    });
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error triggering marketing:", error);
    return { success: false, error: "Failed to trigger marketing" };
  }
}

export {
  // LED
  updateLEDStrip,
  toggleLEDPower,
  bulkUpdateLEDs,
  getLEDStatus,
  // Load Cell
  getLoadCellReadings,
  getStockAlerts,
  pollLoadCellData,
  // Marketing
  pushToRackScreen,
  triggerMarketingContent,
};
