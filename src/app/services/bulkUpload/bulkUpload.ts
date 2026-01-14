/**
 * Bulk Upload Services
 * 
 * Handles all API calls related to device bulk updates.
 * Based on thingsx_ui_v2 implementation.
 * 
 * @fileoverview Bulk upload API service functions
 */

import { api } from "@/app/utils/api";
import { getSiteId } from "@/config/site";
import { toast } from "sonner";

// ===========================================
// Types
// ===========================================

export interface DeviceCategory {
  id: string;
  name: string;
}

export interface DeviceConfigOption {
  id: string;
  name: string;
}

export interface BulkDeviceData {
  tin: string;
  device_name: string;
  [key: string]: string | number | boolean | object;
}

// ===========================================
// Bulk Upload APIs
// ===========================================

/**
 * Get device categories for bulk update
 */
async function getDeviceCategories(siteId?: string): Promise<{ data: DeviceCategory[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/categories", {
      site_id: siteId || getSiteId(),
    });
    
    const categories = resp?.data?.data;
    if (categories && typeof categories === "object") {
      const categoryList = Object.entries(categories).map(([id, name]) => ({
        id,
        name: name as string,
      }));
      return { data: categoryList, error: null };
    }
    
    return { data: [], error: null };
  } catch (error) {
    console.error("Error fetching device categories:", error);
    return { data: null, error: "Failed to fetch device categories" };
  }
}

/**
 * Get device config options for a category
 */
async function getDeviceConfigOptions(deviceCode: string): Promise<{ data: DeviceConfigOption[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/config/options", {
      device_code: deviceCode,
    });
    
    const options = resp?.data?.data;
    if (options && typeof options === "object") {
      const optionList = Object.entries(options).map(([id, name]) => ({
        id,
        name: name as string,
      }));
      return { data: optionList, error: null };
    }
    
    return { data: [], error: null };
  } catch (error) {
    console.error("Error fetching device config options:", error);
    return { data: null, error: "Failed to fetch config options" };
  }
}

/**
 * Retrieve devices for bulk update
 */
async function retrieveDevicesForBulk(
  deviceCategory: string,
  deviceConfig: string,
  templateId?: string
): Promise<{ data: BulkDeviceData[] | null; columns: string[] | null; error: string | null }> {
  try {
    const payload: Record<string, string> = {
      device_code: deviceCategory,
      config_option: deviceConfig,
      site_id: getSiteId(),
    };
    
    if (templateId) {
      payload.template_id = templateId;
    }
    
    const resp = await api.post("/v1/device/bulk/retrieve", payload);
    
    if (resp?.data?.message) {
      toast.message(resp.data.message);
    }
    
    const content = resp?.data?.data?.content || [];
    
    // Flatten nested objects
    const flattenObject = (obj: Record<string, any>): Record<string, any> => {
      const result: Record<string, any> = {};
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(result, obj[key]);
        } else {
          result[key] = obj[key];
        }
      });
      return result;
    };
    
    const flattenedData = content.map((item: any) => flattenObject(item));
    const columns = flattenedData.length > 0 ? Object.keys(flattenedData[0]) : [];
    
    return { data: flattenedData, columns, error: null };
  } catch (error) {
    console.error("Error retrieving devices for bulk:", error);
    return { data: null, columns: null, error: "Failed to retrieve devices" };
  }
}

/**
 * Push bulk update to devices
 */
async function pushBulkUpdate(
  deviceConfig: string,
  data: BulkDeviceData[]
): Promise<{ success: boolean; error: string | null }> {
  if (!deviceConfig) {
    toast.error("Please select device category & device config");
    return { success: false, error: "Missing device config" };
  }
  
  try {
    const resp = await api.post("/v1/device/bulk/update", {
      data: data,
    });
    
    if (resp?.data?.message) {
      toast.message(resp.data.message);
    }
    
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error pushing bulk update:", error);
    return { success: false, error: "Failed to push bulk update" };
  }
}

/**
 * Update single device config
 */
async function updateDeviceConfig(
  tin: string,
  data: Record<string, any>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/config/update", {
      tin: tin,
      data: data,
    });
    
    if (resp?.data?.status === "error") {
      toast.error(resp?.data?.message || "Update failed");
      return { success: false, error: resp?.data?.message };
    }
    
    if (resp?.data?.message) {
      toast.success(resp.data.message);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating device config:", error);
    return { success: false, error: "Failed to update device" };
  }
}

/**
 * Get current device config
 */
async function getDeviceConfig(tin: string): Promise<{ data: Record<string, any> | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/device/config/get", {
      tin: tin,
    });
    
    return { data: resp?.data?.data?.schema || resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error getting device config:", error);
    return { data: null, error: "Failed to get device config" };
  }
}

export {
  getDeviceCategories,
  getDeviceConfigOptions,
  retrieveDevicesForBulk,
  pushBulkUpdate,
  updateDeviceConfig,
  getDeviceConfig,
};
