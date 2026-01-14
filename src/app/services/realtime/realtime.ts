/**
 * Realtime Video Feed Services
 * 
 * Handles all API calls related to video streaming.
 * Based on thingsx_ui_v2 implementation.
 * 
 * @fileoverview Video feed API service functions
 */

import { api } from "@/app/utils/api";
import { getSiteId } from "@/config/site";
import { toast } from "sonner";

// ===========================================
// Types
// ===========================================

export interface CameraStream {
  tin: string;
  device_name: string;
  device_type: string;
  location: string;
  streams: StreamConfig[];
}

export interface ModelConfig {
  model_id: number | string;
  model_name: string;
}

export interface StreamConfig {
  stream_id: string;
  stream_name: string;
  models: ModelConfig[];
}

export interface VideoFeedResponse {
  stream_url: string;
  stream_id: string;
  message?: string;
}

// ===========================================
// Camera APIs
// ===========================================

/**
 * Get all camera streams for a site
 */
async function getCameras(siteId?: string): Promise<{ data: CameraStream[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/feed/get_camera_streams", {
      site_id: siteId || getSiteId(),
    });
    
    // Normalize the response
    const cameras = resp?.data?.data || [];
    const normalizedCameras = cameras.map((cam: any) => {
      // Extract streams with models
      const streams: StreamConfig[] = [];
      
      if (Array.isArray(cam.streams)) {
        cam.streams.forEach((s: any) => {
          const models: ModelConfig[] = [];
          
          // Parse models from stream - API returns "models" array with objects
          // Each model object has: { model_id: number, model_name: string }
          if (Array.isArray(s.models)) {
            s.models.forEach((m: any) => {
              if (typeof m === "object" && m !== null) {
                models.push({
                  model_id: m.model_id ?? m.id ?? 0,
                  model_name: m.model_name ?? m.name ?? "Unknown Model",
                });
              } else if (typeof m === "string") {
                // Legacy: string model names
                models.push({
                  model_id: m,
                  model_name: m,
                });
              }
            });
          }
          // Fallback: check for "model" (singular) field
          else if (s?.model) {
            try {
              let parsed = s.model;
              if (typeof s.model === "string") {
                parsed = JSON.parse(s.model);
              }
              if (Array.isArray(parsed)) {
                parsed.forEach((m: any) => {
                  if (typeof m === "object" && m !== null) {
                    models.push({
                      model_id: m.model_id ?? m.id ?? 0,
                      model_name: m.model_name ?? m.name ?? "Unknown Model",
                    });
                  } else {
                    models.push({
                      model_id: String(m),
                      model_name: String(m),
                    });
                  }
                });
              }
            } catch {
              if (typeof s.model === "string" && s.model.trim()) {
                s.model.split(",").forEach((m: string) => {
                  const name = m.trim();
                  if (name) {
                    models.push({ model_id: name, model_name: name });
                  }
                });
              }
            }
          }
          
          streams.push({
            stream_id: String(s.stream_id || ""),
            stream_name: s.stream_name || String(s.stream_id) || "",
            models: models,
          });
        });
      }
      
      return {
        tin: cam.tin,
        device_name: cam.device_name || cam.tin,
        device_type: cam.device_type || "Camera",
        location: cam.location || "",
        streams: streams,
      };
    });
    
    return { data: normalizedCameras, error: null };
  } catch (error) {
    console.error("Error fetching cameras:", error);
    return { data: null, error: "Failed to fetch cameras" };
  }
}

/**
 * Start or stop a video feed (V2 with stream and model selection)
 * @param tin - Device TIN
 * @param stream - true to start, false to stop
 * @param streamId - Stream ID
 * @param modelId - Model ID (not model name!)
 */
async function getVideoFeedV2(
  tin: string,
  stream: boolean,
  streamId: string,
  modelId: string | number
): Promise<{ data: VideoFeedResponse | null; error: string | null }> {
  try {
    // API requires model_id field with numeric ID
    const resp = await api.post("/v1/feed/get_feed_v2", {
      device_tin: tin,
      stream: stream,
      stream_id: streamId,
      model_id: modelId,
    });
    
    // Response structure: { status, message, data: { stream_url, stream_id } } 
    // OR sometimes: { status, message, stream_url, stream_id }
    const responseData = resp?.data;
    const result: VideoFeedResponse = {
      stream_url: responseData?.data?.stream_url || responseData?.stream_url || "",
      stream_id: responseData?.data?.stream_id || responseData?.stream_id || "",
      message: responseData?.message,
    };
    
    console.log("Video feed response:", responseData);
    console.log("Parsed result:", result);
    
    return { data: result, error: null };
  } catch (error: unknown) {
    console.error("Error with video feed:", error);
    // Extract error message from API response
    let errorMessage = "Failed to control video feed";
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      errorMessage = axiosError.response?.data?.message || errorMessage;
    }
    return { data: null, error: errorMessage };
  }
}

/**
 * Start or stop a video feed (V1 simple)
 */
async function getVideoFeed(
  tin: string,
  stream: boolean
): Promise<{ data: VideoFeedResponse | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/feed", {
      device_tin: tin,
      stream: stream,
    });
    
    if (resp?.data?.message) {
      toast.message(resp.data.message);
    }
    
    return { data: resp?.data?.data || resp?.data, error: null };
  } catch (error) {
    console.error("Error with video feed:", error);
    return { data: null, error: "Failed to control video feed" };
  }
}

export {
  getCameras,
  getVideoFeed,
  getVideoFeedV2,
};
