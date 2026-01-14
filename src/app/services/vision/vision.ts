/**
 * Computer Vision Services
 * 
 * Handles all API calls related to computer vision analytics.
 * Includes demographics, heatmaps, dwell time, and person tracking.
 * 
 * @fileoverview Computer vision-related API service functions
 */

import { api } from "@/app/utils/api";
import { getSiteId } from "@/config/site";

// ===========================================
// Types
// ===========================================

export interface DemographicData {
  age_group: string;
  gender: string;
  count: number;
  percentage: number;
}

export interface DemographicSummary {
  ageGroups: { label: string; count: number; percentage: number }[];
  genderSplit: { male: number; female: number };
  accessoriesDetected: { type: string; count: number }[];
  totalVisitors: number;
}

export interface DwellingTimeData {
  zone_name: string;
  avg_dwell_time: number;
  total_visitors: number;
  engagement_score: number;
}

export interface HeatmapData {
  zone_name: string;
  x: number;
  y: number;
  intensity: number;
  timestamp?: string;
}

export interface ProductInteractionData {
  zone_name: string;
  product_name?: string;
  interaction_count: number;
  timestamp?: string;
}

export interface PersonTrace {
  person_id: string;
  person_name: string;
  zones_visited: string[];
  timestamps: string[];
  total_time: number;
}

export interface ZonePeopleCount {
  zone_name: string;
  current_count: number;
  peak_count: number;
  avg_count: number;
}

// ===========================================
// Demographics APIs
// ===========================================

/**
 * Fetch demographic analytics data
 */
async function fetchDemographics(
  siteId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: DemographicData[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/analytics", {
      site_id: siteId || getSiteId(),
      type: "demographics",
      start_date: startDate,
      end_date: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching demographics:", error);
    return { data: null, error: "Failed to fetch demographic data" };
  }
}

/**
 * Fetch accessories detection data (bags, glasses, etc.)
 */
async function fetchAccessoriesCount(
  siteId: string,
  type: "bag_counts" | "accessories_counts" | "brands" | "shoes",
  startDate?: string,
  endDate?: string
): Promise<{ data: Record<string, number>[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/analytics", {
      site_id: siteId || getSiteId(),
      type: type,
      start_date: startDate,
      end_date: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching accessories:", error);
    return { data: null, error: "Failed to fetch accessories data" };
  }
}

// ===========================================
// Dwelling Time & Heatmap APIs
// ===========================================

/**
 * Fetch dwelling time analytics
 */
async function fetchDwellingTime(
  siteId: string,
  startDate?: string,
  endDate?: string,
  aggregation?: string
): Promise<{ data: DwellingTimeData[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/metrics/dwelling_time", {
      site_id: siteId || getSiteId(),
      from_date: startDate,
      to_date: endDate,
      aggregation: aggregation,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching dwelling time:", error);
    return { data: null, error: "Failed to fetch dwelling time data" };
  }
}

/**
 * Fetch zone count heatmap
 */
async function fetchZoneCountHeatmap(
  siteId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: HeatmapData[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/metrics/zone_counts_heatmap", {
      site_id: siteId || getSiteId(),
      start_date: startDate,
      end_date: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching heatmap:", error);
    return { data: null, error: "Failed to fetch heatmap data" };
  }
}

/**
 * Fetch product interaction heatmap
 */
async function fetchProductInteraction(
  siteId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: ProductInteractionData[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/metrics/product_interaction_heatmap", {
      site_id: siteId || getSiteId(),
      start_date: startDate,
      end_date: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching product interaction:", error);
    return { data: null, error: "Failed to fetch interaction data" };
  }
}

// ===========================================
// People Tracking APIs
// ===========================================

/**
 * Fetch zone people counts
 */
async function fetchZonesPeopleCount(
  siteId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: ZonePeopleCount[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/metrics/zone_people_counts", {
      site_id: siteId || getSiteId(),
      from_date: startDate,
      to_date: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching zone people count:", error);
    return { data: null, error: "Failed to fetch zone counts" };
  }
}

/**
 * Fetch person trace/journey data
 */
async function fetchPersonTrace(
  siteId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: PersonTrace[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/zones/person_trace", {
      site_id: siteId || getSiteId(),
      start: startDate,
      end: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching person trace:", error);
    return { data: null, error: "Failed to fetch person trace" };
  }
}

// ===========================================
// Camera & Video APIs
// ===========================================

/**
 * Get available camera streams
 */
async function getCameraStreams(siteId: string): Promise<{ data: { tin: string; name: string; stream_url: string }[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/feed/get_camera_streams", {
      site_id: siteId || getSiteId(),
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error getting camera streams:", error);
    return { data: null, error: "Failed to get cameras" };
  }
}

/**
 * Start/stop video feed
 */
async function toggleVideoFeed(
  tin: string,
  stream: boolean,
  streamId?: string,
  model?: string
): Promise<{ data: { stream_url: string } | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/feed/get_feed_v2", {
      device_tin: tin,
      stream: stream,
      stream_id: streamId,
      model: model,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error toggling video feed:", error);
    return { data: null, error: "Failed to toggle video feed" };
  }
}

export {
  // Demographics
  fetchDemographics,
  fetchAccessoriesCount,
  // Dwelling & Heatmap
  fetchDwellingTime,
  fetchZoneCountHeatmap,
  fetchProductInteraction,
  // People Tracking
  fetchZonesPeopleCount,
  fetchPersonTrace,
  // Camera
  getCameraStreams,
  toggleVideoFeed,
};
