"use client";

// Stubbed heatmap service to be replaced with real API wiring.
// Matches the style used in thingsx_ui_v2 service modules.

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

export async function fetchZoneCountHeatmap(params: {
  siteId: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: ZoneHeatmapData[] | null; error: string | null }> {
  // TODO: wire to real API
  return { data: [], error: null };
}

export async function fetchProductInteractionHeatmap(params: {
  siteId: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: ProductInteractionData[] | null; error: string | null }> {
  // TODO: wire to real API
  return { data: [], error: null };
}

export function normalizeHeatmapData<T extends ZoneHeatmapData | ProductInteractionData>(data: T[]): T[] {
  return data || [];
}

export function calculateHeatmapRange(data: Array<ZoneHeatmapData | ProductInteractionData>): HeatmapRange {
  if (!data || data.length === 0) return { min: 0, max: 0 };
  const counts = data.map((d) => getCountValue(d) || 0);
  return { min: Math.min(...counts), max: Math.max(...counts) };
}

export function getCountValue(item: ZoneHeatmapData | ProductInteractionData): number | null {
  if ("count" in item && item.count !== undefined) return Number(item.count);
  if ("interaction_count" in item && (item as ProductInteractionData).interaction_count !== undefined) {
    return Number((item as ProductInteractionData).interaction_count);
  }
  return null;
}
