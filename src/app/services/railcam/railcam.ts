// Rail Cam Service — handles camera controls, video feed, and scan data

import { api } from "@/app/utils/api";
import { ok, fail, getErrorMessage, ServiceResult } from "@/app/services/serviceUtils";
import { getDeviceConfig, updateDeviceConfig } from "@/app/services/sensors/sensors";
import { getCameras, getVideoFeedV2 } from "@/app/services/realtime/realtime";
import { RAILCAM_TIN, STEPPER_RAIL_TIN } from "@/config/devices";

// Types
export interface RailcamScanResult {
    [key: string]: unknown;
}

export interface RailcamConfig {
    schema: Record<string, unknown> | null;
}

// Fetch rail cam device config (control schema)
export async function getRailcamConfig(): Promise<ServiceResult<Record<string, unknown> | null>> {
    return getDeviceConfig(STEPPER_RAIL_TIN);
}

// Send a movement command to the rail cam stepper
export async function sendRailcamCommand(
    direction: "left" | "right" | "stop" | "auto",
    distance: number = 20,
    speed: number = 50
): Promise<ServiceResult<{ status?: string; message?: string }>> {
    try {
        const resp = await api.post("/v1/device/config/update/individual/v2", {
            tin: STEPPER_RAIL_TIN,
            data: {
                stepper_control: {
                    speed: speed,
                    distance: distance,
                    direction: direction,
                },
            },
        });

        if (resp?.data.status === "error") {
            return fail(resp?.data?.message || "Command failed");
        }
        return ok(resp?.data);
    } catch (error) {
        console.error("Error sending railcam command:", error);
        return fail(getErrorMessage(error, "Failed to send camera command"));
    }
}

// Fetch scan data within a given time range
export async function getRailcamDetails(
    startDate: string,
    endDate: string
): Promise<ServiceResult<RailcamScanResult[]>> {
    try {
        const resp = await api.post("/v1/tin/railcam_details", {
            start_date: startDate,
            end_date: endDate,
        });
        const data = resp?.data?.data || resp?.data || [];
        return ok(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error fetching railcam details:", error);
        return fail(getErrorMessage(error, "Failed to fetch railcam scan data"));
    }
}

// Start video feed for the rail cam
export async function startRailcamFeed(): Promise<ServiceResult<{ streamUrl: string; streamId: string }>> {
    try {
        // Find the rail cam in the cameras list
        const camerasResult = await getCameras();
        if (camerasResult.error || !camerasResult.data) {
            return fail(camerasResult.error || "Failed to load cameras");
        }

        const railCam = camerasResult.data.find((c) => c.tin === RAILCAM_TIN);
        if (!railCam) {
            return fail(`Rail cam ${RAILCAM_TIN} not found in camera list`);
        }

        if (railCam.streams.length === 0) {
            return fail("No streams available for the rail cam");
        }

        // Use the first stream and first model by default
        const stream = railCam.streams[0];
        const model = stream.models?.[0];
        const modelId = model?.model_id ?? "";

        const feedResult = await getVideoFeedV2(RAILCAM_TIN, true, stream.stream_id, modelId);
        if (feedResult.error || !feedResult.data) {
            return fail(feedResult.error || "Failed to start rail cam feed");
        }

        return ok({
            streamUrl: feedResult.data.stream_url,
            streamId: feedResult.data.stream_id,
        });
    } catch (error) {
        console.error("Error starting railcam feed:", error);
        return fail(getErrorMessage(error, "Failed to start rail cam video feed"));
    }
}

// Stop video feed for the rail cam
export async function stopRailcamFeed(): Promise<ServiceResult<{ message?: string }>> {
    try {
        const camerasResult = await getCameras();
        if (camerasResult.error || !camerasResult.data) {
            return fail(camerasResult.error || "Failed to load cameras");
        }

        const railCam = camerasResult.data.find((c) => c.tin === RAILCAM_TIN);
        if (!railCam || railCam.streams.length === 0) {
            return fail("Rail cam not found");
        }

        const stream = railCam.streams[0];
        const model = stream.models?.[0];
        const modelId = model?.model_id ?? "";

        const feedResult = await getVideoFeedV2(RAILCAM_TIN, false, stream.stream_id, modelId);
        if (feedResult.error) {
            return fail(feedResult.error);
        }

        return ok({ message: feedResult.data?.message || "Feed stopped" });
    } catch (error) {
        console.error("Error stopping railcam feed:", error);
        return fail(getErrorMessage(error, "Failed to stop rail cam video feed"));
    }
}
