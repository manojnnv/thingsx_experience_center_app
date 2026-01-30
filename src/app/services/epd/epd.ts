/**
 * EPD (E-Paper Display) API Services
 * 
 * APIs for EPD value updates - bulk and individual
 * Uses Axios client from api.ts
 */

import { api } from "@/app/utils/api";
import { toast } from "sonner";
import { fail, getErrorMessage, ok, ServiceResult } from "@/app/services/serviceUtils";

// Types
export interface EPDDevice {
  tin: string;
  device_name: string;
  device_code?: string;
  width?: number;
  height?: number;
  color?: string;
  status: "online" | "offline";
  current_value?: Record<string, unknown>;
}

export interface EPDUpdateData {
  tin: string;
  data: Record<string, unknown>;
}

export interface BulkUpdatePayload {
  tin: string;
  [key: string]: unknown;
}

/**
 * Get all EPD devices
 */
export const getAllEPDDevices = async (): Promise<ServiceResult<EPDDevice[]>> => {
  try {
    const resp = await api.post("/v1/device/device_specific", {
      device_category: "E-Paper Endnode",
    });
    return ok(resp?.data?.data || []);
  } catch (error) {
    console.error("Error fetching EPD devices:", error);
    return fail(getErrorMessage(error, "Failed to fetch EPD devices"));
  }
};

/**
 * Get device categories for filtering
 */
export const getDeviceCategories = async (): Promise<ServiceResult<string[]>> => {
  try {
    const resp = await api.post("/v1/device/categories", {
      site_id: localStorage.getItem("site_id"),
    });
    return ok(resp?.data?.data || []);
  } catch (error) {
    console.error("Error fetching device categories:", error);
    return fail(getErrorMessage(error, "Failed to fetch device categories"));
  }
};

/**
 * Get device config options for a category
 */
export const getDeviceConfigOptions = async (
  deviceCode: string
): Promise<ServiceResult<Record<string, unknown>[]>> => {
  try {
    const resp = await api.post("v1/device/config/options", {
      device_code: deviceCode,
    });
    toast.message(resp?.data?.message);
    return ok(resp?.data?.data || []);
  } catch (error) {
    console.error("Error fetching device config options:", error);
    return fail(getErrorMessage(error, "Failed to fetch device config options"));
  }
};

/**
 * Get current config/values for a specific device
 */
export const getDeviceCurrentConfig = async (
  tin: string
): Promise<ServiceResult<Record<string, unknown> | null>> => {
  try {
    const resp = await api.post("v1/device/config/get", {
      tin,
    });
    return ok(resp?.data?.data?.schema || resp?.data?.data || null);
  } catch (error) {
    console.error("Error fetching device config:", error);
    return fail(getErrorMessage(error, "Failed to fetch device config"));
  }
};

/**
 * Update individual EPD value
 */
export const updateEPDValue = async (
  tin: string,
  data: Record<string, unknown>
): Promise<ServiceResult<{ status?: string; message?: string }>> => {
  try {
    const resp = await api.post("v1/device/config/update", {
      tin,
      data,
    });

    if (resp?.data?.status === "error") {
      toast.error(resp?.data?.message || "Failed to update EPD");
    } else if (resp?.data?.status === "success") {
      toast.success(resp?.data?.message || "EPD updated successfully");
    }

    return ok(resp?.data);
  } catch (error) {
    console.error("Error updating EPD value:", error);
    toast.error("Failed to update EPD");
    return fail(getErrorMessage(error, "Failed to update EPD"));
  }
};

/**
 * Bulk update EPD values
 */
export const bulkUpdateEPD = async (
  updates: BulkUpdatePayload[]
): Promise<ServiceResult<{ status?: string; message?: string }>> => {
  try {
    const resp = await api.post("/v1/device/bulk/update", {
      data: updates,
    });

    if (resp?.data?.status === "error") {
      toast.error(resp?.data?.message || "Bulk update failed");
    } else {
      toast.success(resp?.data?.message || "Bulk update successful");
    }

    return ok(resp?.data);
  } catch (error) {
    console.error("Error in bulk update:", error);
    toast.error("Bulk update failed");
    return fail(getErrorMessage(error, "Bulk update failed"));
  }
};

/**
 * Retrieve devices for bulk operations
 */
export const retrieveDevicesForBulk = async (
  deviceCode: string,
  configOption: string
): Promise<ServiceResult<EPDDevice[]>> => {
  try {
    const resp = await api.post("/v1/device/bulk/retrieve", {
      device_code: deviceCode,
      config_option: configOption,
      site_id: localStorage.getItem("site_id"),
    });
    toast.message(resp?.data?.message);
    return ok(resp?.data?.data?.content || []);
  } catch (error) {
    console.error("Error retrieving devices for bulk:", error);
    return fail(getErrorMessage(error, "Failed to retrieve bulk devices"));
  }
};

/**
 * Get device details
 */
export const getEPDDetails = async (
  tin: string
): Promise<ServiceResult<EPDDevice | null>> => {
  try {
    const resp = await api.post("/v1/device/details", {
      tin,
    });
    return ok(resp?.data?.data ?? null);
  } catch (error) {
    console.error("Error fetching EPD details:", error);
    return fail(getErrorMessage(error, "Failed to fetch EPD details"));
  }
};
