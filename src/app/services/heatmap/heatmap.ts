"use client";

import { api } from "@/app/utils/api";
import { toast } from "sonner";
import { fail, getErrorMessage, ok, ServiceResult } from "@/app/services/serviceUtils";

export interface ZoneHeatmapData {
  zone_id: number | string;
  zone_name?: string;
  count?: number;
  demographics?: Record<string, Record<string, number>>;
}

export interface ProductInteractionData {
  product_id?: string | number;
  product_name?: string;
  alias?: string;
  zone_id: number | string;
  zone_name?: string;
  interaction_count?: number;
  demographics?: Record<string, Record<string, number>>;
}

export interface HeatmapRange {
  min: number;
  max: number;
}

const zoneCountHeatMap = async (params: {
  siteId: string;
  startDate?: string;
  endDate?: string;
}): Promise<ServiceResult<ZoneHeatmapData[]>> => {
  try {
    const resp = await api.post("/v1/metrics/zone_counts_heatmap", {
      site_id: params.siteId || localStorage.getItem("site_id"),
      start_date: params.startDate,
      end_date: params.endDate,
    });
    toast.message(resp?.data?.message);
    return ok(resp?.data?.data || []);
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to load zone heatmap"));
  }
};

const productInteraction = async (params: {
  siteId: string;
  startDate?: string;
  endDate?: string;
}): Promise<ServiceResult<ProductInteractionData[]>> => {
  try {
    const resp = await api.post("/v1/metrics/product_interaction_heatmap", {
      site_id: params.siteId || localStorage.getItem("site_id"),
      start_date: params.startDate,
      end_date: params.endDate,
    });
    toast.message(resp?.data?.message);
    return ok(resp?.data?.data || []);
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to load product heatmap"));
  }
};

const normalizeHeatmapData = <T extends ZoneHeatmapData | ProductInteractionData>(data: T[]): T[] => {
  return data || [];
};

const calculateHeatmapRange = (data: Array<ZoneHeatmapData | ProductInteractionData>): HeatmapRange => {
  if (!data || data.length === 0) return { min: 0, max: 0 };
  const counts = data.map((d) => getCountValue(d) || 0);
  return { min: Math.min(...counts), max: Math.max(...counts) };
};

const getCountValue = (item: ZoneHeatmapData | ProductInteractionData): number | null => {
  const raw =
    (item as ZoneHeatmapData).count ??
    (item as ProductInteractionData).interaction_count ??
    (item as any).visitor_count ??
    (item as any).visitorCount ??
    (item as any).interaction_count ??
    (item as any).interactionCount ??
    (item as any).value ??
    (item as any).total ??
    (item as any).sum;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
};

export {
  zoneCountHeatMap,
  productInteraction,
  normalizeHeatmapData,
  calculateHeatmapRange,
  getCountValue,
};
