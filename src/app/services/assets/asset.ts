/**
 * Asset API Services
 * 
 * APIs for asset management and tracking
 */

import { api } from "@/app/utils/api";
import { toast } from "sonner";

export interface Asset {
  asset_id: number;
  asset_name: string;
  asset_cross_ref_code: string;
  asset_type: string;
  active_tracking: boolean;
  passive_tracking: boolean;
}

export interface AssetPosition {
  asset_id: string;
  asset_name?: string;
  x: number;
  y: number;
  z?: number;
  timestamp?: string;
}

export const getAllAssetData = async (siteID: string) => {
  try {
    const resp = await api.post("/v1/asset/fetch_all", {
      site_id: siteID || localStorage.getItem("site_id"),
    });
    toast.message(resp?.data?.message);
    return resp?.data?.data;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Get asset by ID
 */
export const getAssetById = async (assetId: string): Promise<Asset | null> => {
  try {
    const resp = await api.post("/v1/asset/get", {
      asset_id: assetId,
    });
    return resp?.data?.data || null;
  } catch (error) {
    console.error("Error fetching asset:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Get asset live position
 */
export const getAssetLivePosition = async (assetId: string): Promise<AssetPosition | null> => {
  try {
    const resp = await api.get(`/v1/asset/position/${assetId}`);
    return resp?.data?.data || null;
  } catch (error) {
    console.error("Error fetching asset position:", error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

export const passiveAssetTracking = async (params: {
  asset_id: string;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const resp = await api.post("/v1/asset/passive-tracking", {
      asset_id: params.asset_id,
      start_date: params.startDate,
      end_date: params.endDate,
    });
    toast.message(resp?.data?.message);
    return resp?.data?.data;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};
