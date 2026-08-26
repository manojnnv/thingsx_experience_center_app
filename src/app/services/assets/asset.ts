/**
 * Asset API Services
 * 
 * APIs for asset management and tracking
 */

import { api } from "@/app/utils/api";
import { toast } from "sonner";
import { getOrgId, getSiteId } from "@/config/site";
import { getLayout, parseLayoutJson } from "@/lib/layout";

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
      site_id: siteID || getSiteId(),
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

/**
 * Passive asset tracking – experience-center roadmap variant
 * Used to power the journey roadmap view in the Passive Tracking tab.
 */
export const passiveAssetTrackingRoadmap = async (params: {
  asset_id: string;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const resp = await api.post("/v1/asset/passive-tracking-experience-center", {
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

const isBlankZoneName = (name?: string | null) =>
  !name?.trim() || name.trim().toLowerCase() === "null";

const pickDeviceZoneName = (device: any): string => {
  const name =
    device?.location_info ||
    device?.locationInfo ||
    device?.zone_name ||
    device?.zoneName ||
    device?.located_zone_name ||
    device?.location ||
    "";
  return typeof name === "string" ? name.trim() : "";
};

const collectTinZonesFromLayout = (
  node: any,
  map: Record<string, string>
) => {
  if (!node || typeof node !== "object") return;
  const tin =
    node.tin ||
    node.TIN ||
    node.deviceTin ||
    node.ref_tin ||
    node.data?.tin;
  const zone =
    node.location_info ||
    node.zoneName ||
    node.zone_name ||
    node.location ||
    (node.isZone ? node.name : "") ||
    node.labelText;
  if (tin && typeof zone === "string" && zone.trim()) {
    map[String(tin)] = zone.trim();
  }
  const kids = node.objects || node.children;
  if (Array.isArray(kids)) {
    kids.forEach((child) => collectTinZonesFromLayout(child, map));
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectTinZonesFromLayout(child, map));
  }
};

/**
 * Fill missing located_zone_name values using the device catalog (TIN → zone).
 */
export const fillLocatedZoneNames = async <
  T extends { located_tin?: string; located_zone_name?: string | null },
>(
  records: T[]
): Promise<T[]> => {
  if (!Array.isArray(records) || records.length === 0) return records;

  const missingTins = [
    ...new Set(
      records
        .filter((r) => isBlankZoneName(r.located_zone_name))
        .map((r) => r.located_tin)
        .filter((tin): tin is string => Boolean(tin))
    ),
  ];
  if (missingTins.length === 0) return records;

  const zoneByTin: Record<string, string> = {};

  try {
    const resp = await api.post("/v1/device/retrieval", {
      org_id: getOrgId(),
      site_id: getSiteId(),
    });
    const devices = resp?.data?.data || [];
    for (const device of devices) {
      const tin = device?.tin as string | undefined;
      const zoneName = pickDeviceZoneName(device);
      if (tin && zoneName) zoneByTin[tin] = zoneName;
    }
  } catch {
    // per-TIN lookup below
  }

  const stillMissing = missingTins.filter((tin) => !zoneByTin[tin]);
  await Promise.all(
    stillMissing.map(async (tin) => {
      try {
        const resp = await api.post("/v1/device/details", { tin });
        const zoneName = pickDeviceZoneName(resp?.data?.data);
        if (zoneName) zoneByTin[tin] = zoneName;
      } catch {
        // leave unresolved
      }
    })
  );

  const unresolved = missingTins.filter((tin) => !zoneByTin[tin]);
  if (unresolved.length > 0) {
    try {
      const layoutResult = await getLayout();
      const parsed = parseLayoutJson(layoutResult.data);
      const layoutRoot =
        (parsed as any)?.parsed ??
        (parsed as any)?.layout_json ??
        parsed;
      collectTinZonesFromLayout(layoutRoot, zoneByTin);
    } catch {
      // layout is optional
    }
  }

  return records.map((record) => {
    if (!isBlankZoneName(record.located_zone_name)) return record;
    const resolved = record.located_tin
      ? zoneByTin[record.located_tin]
      : undefined;
    return resolved ? { ...record, located_zone_name: resolved } : record;
  });
};
