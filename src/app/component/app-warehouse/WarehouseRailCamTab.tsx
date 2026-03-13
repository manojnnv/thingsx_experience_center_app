"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { colors } from "@/config/theme";
import { DataTable } from "@/app/component/app-data-table/data-table";
import AppLoading from "@/app/component/app-loading/AppLoading";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Square } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import {
    getRailcamConfig,
    sendRailcamCommand,
    getRailcamDetails,
    startRailcamFeed,
    stopRailcamFeed,
} from "@/app/services/railcam/railcam";

// Constants
const POLL_INTERVAL_MS = 5000; // Poll scan data every 5 seconds
const MAX_DISTINCT_PALLETS = 3; // Stop polling after this many distinct pallets

interface WarehouseRailCamTabProps {
    accentColor?: string;
}

function WarehouseRailCamTab({
    accentColor = colors.warehouseAccent,
}: WarehouseRailCamTabProps) {
    // Video feed state
    const [videoStatus, setVideoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [videoUrl, setVideoUrl] = useState("");
    const [videoError, setVideoError] = useState("");

    // Camera controls state
    const [speed, setSpeed] = useState(50);
    const [steps, setSteps] = useState(500);
    const [isSendingCommand, setIsSendingCommand] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);
    const [controlConfig, setControlConfig] = useState<Record<string, unknown> | null>(null);

    // Auto-scan state
    const [isAutoScanning, setIsAutoScanning] = useState(false);
    const scanStartTimeRef = useRef<string | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Scan data state
    const [scanData, setScanData] = useState<Record<string, unknown>[]>([]);
    const [scanColumns, setScanColumns] = useState<ColumnDef<any>[]>([]);
    const [scanLoading, setScanLoading] = useState(false);

    // Load device config on mount
    useEffect(() => {
        let cancelled = false;
        const loadConfig = async () => {
            setConfigLoading(true);
            try {
                const result = await getRailcamConfig();
                if (!cancelled && result.data) {
                    setControlConfig(result.data);
                }
            } catch {
                // Config load error — controls will still work with defaults
            } finally {
                if (!cancelled) setConfigLoading(false);
            }
        };
        loadConfig();
        return () => { cancelled = true; };
    }, []);

    // Start video feed
    const handleStartFeed = useCallback(async () => {
        setVideoStatus("loading");
        setVideoError("");
        const result = await startRailcamFeed();
        if (result.error || !result.data?.streamUrl) {
            setVideoStatus("error");
            setVideoError(result.error || "Failed to start video feed");
            return;
        }
        setVideoUrl(result.data.streamUrl);
        setVideoStatus("success");
    }, []);

    // Stop video feed
    const handleStopFeed = useCallback(async () => {
        await stopRailcamFeed();
        setVideoStatus("idle");
        setVideoUrl("");
    }, []);

    const HIDDEN_COLUMNS = new Set(["box_present", "qr_present", "x_center", "y_center", "device"]);

    const generateColumns = useCallback((keys: string[]): ColumnDef<any>[] => {
        return keys.filter((key) => !HIDDEN_COLUMNS.has(key)).map((key) => ({
            accessorKey: key,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    style={{ color: colors.text }}
                >
                    {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="ml-2" style={{ color: colors.text }}>
                    {String(row.getValue(key) ?? "")}
                </div>
            ),
        }));
    }, []);

    // Send a movement command
    const handleCommand = useCallback(async (direction: "left" | "right" | "stop" | "auto") => {
        setIsSendingCommand(true);
        try {
            // Pass direction, distance (steps), and current speed
            const result = await sendRailcamCommand(direction, steps, speed);
            if (result.error) {
                toast.error(result.error);
            }
        } catch {
            toast.error("Failed to send command");
        } finally {
            setIsSendingCommand(false);
        }
    }, [steps, speed]);

    // Count distinct pallets in scan data (uses first column as identifier)
    const countDistinctPallets = useCallback((data: Record<string, unknown>[]): number => {
        if (data.length === 0) return 0;
        const firstKey = Object.keys(data[0])[0];
        if (!firstKey) return data.length;
        const unique = new Set(data.map((row) => String(row[firstKey] ?? "")));
        return unique.size;
    }, []);

    // Stop auto-scan polling
    const stopAutoScan = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        setIsAutoScanning(false);
        scanStartTimeRef.current = null;
    }, []);

    // Poll scan data during auto-scan
    const pollScanData = useCallback(async () => {
        if (!scanStartTimeRef.current) return;

        const result = await getRailcamDetails(
            scanStartTimeRef.current,
            new Date().toISOString()
        );

        if (result.error || !result.data) return;

        const data = result.data;
        if (data.length > 0) {
            const keys = Object.keys(data[0]);
            setScanColumns(generateColumns(keys));
            setScanData(data);

            // Check if we have enough distinct pallets to stop
            const distinctCount = countDistinctPallets(data);
            if (distinctCount >= MAX_DISTINCT_PALLETS) {
                toast.success(`Scan complete — ${distinctCount} pallets detected`);
                stopAutoScan();
            }
        }
    }, [generateColumns, countDistinctPallets, stopAutoScan]);

    // Start auto-scan
    const handleAutoScan = useCallback(async () => {
        // Record start time
        scanStartTimeRef.current = new Date().toISOString();
        setIsAutoScanning(true);
        setScanData([]);
        setScanColumns([]);

        // Send auto command to the camera
        setIsSendingCommand(true);
        try {
            const result = await sendRailcamCommand("auto", steps, speed);
            if (result.error) {
                toast.error(result.error);
                stopAutoScan();
                return;
            }
        } catch {
            toast.error("Failed to start auto scan");
            stopAutoScan();
            return;
        } finally {
            setIsSendingCommand(false);
        }

        // Start polling for scan data
        pollScanData(); // first poll immediately
        pollIntervalRef.current = setInterval(pollScanData, POLL_INTERVAL_MS);
    }, [pollScanData, stopAutoScan, steps, speed]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    return (
        <div className="flex flex-col h-full gap-3 overflow-hidden">
            {/* TOP SECTION: Video Feed + Camera Controls */}
            <div className="flex gap-3" style={{ height: "55%" }}>
                {/* Video Feed */}
                <div
                    className="flex-[65] min-w-0 rounded-2xl overflow-hidden flex flex-col"
                    style={{
                        backgroundColor: colors.backgroundCard,
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    {videoStatus === "idle" && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div
                                    className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                                    style={{ backgroundColor: `${colors.border}50` }}
                                >
                                    <svg className="w-8 h-8" fill={accentColor} viewBox="0 0 24 24">
                                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                                    </svg>
                                </div>
                                <p className="text-base font-medium mb-1" style={{ color: colors.text }}>
                                    No Active Feed
                                </p>
                                <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                                    Start the feed or run an Auto Scan
                                </p>
                                <button
                                    onClick={handleStartFeed}
                                    className="px-6 py-2.5 rounded-xl font-bold transition-all hover:opacity-90 flex items-center gap-2 mx-auto"
                                    style={{ backgroundColor: accentColor, color: colors.background }}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                    Start Feed
                                </button>
                            </div>
                        </div>
                    )}

                    {videoStatus === "loading" && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 mx-auto mb-3 border-4 rounded-full animate-spin"
                                    style={{ borderColor: `${accentColor} transparent transparent` }}
                                />
                                <p className="text-base font-medium" style={{ color: colors.text }}>
                                    Starting feed...
                                </p>
                            </div>
                        </div>
                    )}

                    {videoStatus === "success" && videoUrl && (
                        <div className="flex-1 min-h-0 relative">
                            {/* LIVE badge */}
                            <div
                                className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5"
                                style={{ backgroundColor: "#ef4444", color: "#fff" }}
                            >
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                LIVE
                            </div>
                            <iframe
                                src={videoUrl}
                                title="Rail Cam Stream"
                                className="w-full h-full"
                                allow="autoplay; fullscreen"
                            />
                        </div>
                    )}

                    {videoStatus === "error" && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                                >
                                    <svg className="w-6 h-6" fill="#ef4444" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                </div>
                                <p className="text-base font-medium mb-1" style={{ color: colors.text }}>
                                    Feed Error
                                </p>
                                <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                                    {videoError || "Failed to load stream"}
                                </p>
                                <button
                                    onClick={handleStartFeed}
                                    className="px-6 py-2 rounded-lg font-semibold border transition-all hover:opacity-80"
                                    style={{ borderColor: accentColor, color: accentColor }}
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stop button when streaming */}
                    {videoStatus === "success" && (
                        <div
                            className="flex-none p-2 flex justify-between items-center"
                            style={{ borderTop: `1px solid ${colors.border}` }}
                        >
                            <span className="text-xs font-mono px-2" style={{ color: colors.textMuted }}>
                                ST0008000001
                            </span>
                            <button
                                onClick={handleStopFeed}
                                className="px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all hover:opacity-90"
                                style={{ backgroundColor: "#ef4444", color: "#fff" }}
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 6h12v12H6z" />
                                </svg>
                                Stop
                            </button>
                        </div>
                    )}
                </div>

                {/* Camera Controls */}
                <div
                    className="flex-[35] min-w-0 rounded-2xl p-4 flex flex-col"
                    style={{
                        backgroundColor: colors.backgroundCard,
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: accentColor }}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                        Camera Controls
                    </h3>

                    {/* Speed Slider */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                                Speed
                            </label>
                            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                {speed}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={speed}
                            onChange={(e) => setSpeed(parseInt(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                            style={{
                                backgroundColor: `${accentColor}40`,
                                backgroundSize: `${speed}% 100%`,
                                backgroundImage: `linear-gradient(${accentColor}, ${accentColor})`,
                                backgroundRepeat: "no-repeat",
                                accentColor: accentColor,
                            }}
                        />
                    </div>

                    {/* Steps input */}
                    <div className="mb-3">
                        <label className="block text-sm mb-2 font-medium" style={{ color: colors.textMuted }}>
                            Steps
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSteps((s) => Math.max(1, s - 100))}
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-all hover:opacity-80"
                                style={{
                                    backgroundColor: colors.background,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.text,
                                }}
                            >
                                −
                            </button>
                            <input
                                type="number"
                                value={steps}
                                onChange={(e) => setSteps(Math.max(1, parseInt(e.target.value) || 1))}
                                className="flex-1 h-9 rounded-lg text-center text-sm font-mono outline-none"
                                style={{
                                    backgroundColor: colors.background,
                                    border: `1px solid ${accentColor}40`,
                                    color: colors.text,
                                }}
                            />
                            <button
                                onClick={() => setSteps((s) => s + 100)}
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-all hover:opacity-80"
                                style={{
                                    backgroundColor: colors.background,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.text,
                                }}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Direction buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                            { cmd: "left" as const, label: "Left", icon: <ChevronLeft className="w-5 h-5" strokeWidth={2.5} /> },
                            { cmd: "stop" as const, label: "Stop", icon: <Square className="w-4 h-4 rounded-sm" fill="currentColor" /> },
                            { cmd: "right" as const, label: "Right", icon: <ChevronRight className="w-5 h-5" strokeWidth={2.5} /> },
                        ].map((btn) => (
                            <button
                                key={btn.cmd}
                                onClick={() => handleCommand(btn.cmd)}
                                disabled={isSendingCommand || isAutoScanning}
                                className="flex flex-col items-center justify-center py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    backgroundColor: colors.background,
                                    border: `1px solid ${colors.border}`,
                                    color: btn.cmd === "stop" ? "#ef4444" : accentColor,
                                }}
                                title={btn.label}
                            >
                                <span className="flex items-center justify-center h-6">{btn.icon}</span>
                                <span className="text-[10px] mt-0.5 font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                                    {btn.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Auto Scan button */}
                    <button
                        onClick={isAutoScanning ? stopAutoScan : handleAutoScan}
                        disabled={isSendingCommand}
                        className="w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                        style={{
                            backgroundColor: isAutoScanning ? "#ef4444" : accentColor,
                            color: isAutoScanning ? "#fff" : colors.background,
                        }}
                    >
                        {isAutoScanning ? (
                            <>
                                <div
                                    className="w-4 h-4 border-2 rounded-full animate-spin"
                                    style={{ borderColor: "#fff transparent transparent" }}
                                />
                                Stop Scan
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                Auto Scan
                            </>
                        )}
                    </button>

                    {/* Scan progress indicator */}
                    {isAutoScanning && (
                        <div className="mt-3 text-center">
                            <p className="text-xs" style={{ color: colors.textMuted }}>
                                Scanning... {scanData.length > 0 ? `${countDistinctPallets(scanData)}/${MAX_DISTINCT_PALLETS} pallets` : "waiting for data"}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM SECTION: Scan Data Table */}
            <div
                className="flex-1 min-h-0 rounded-2xl flex flex-col overflow-hidden"
                style={{
                    backgroundColor: colors.backgroundCard,
                    border: `1px solid ${colors.border}`,
                }}
            >
                {/* Table header */}
                <div className="flex items-center justify-between px-5 py-3 flex-none" style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: accentColor }}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 10.875c-.621 0-1.125.504-1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 1.5c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5c0-.621-.504-1.125-1.125-1.125m0 0c-.621 0-1.125.504-1.125 1.125" />
                        </svg>
                        Scan Results
                        {scanData.length > 0 && (
                            <span
                                className="text-xs font-normal px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                            >
                                {scanData.length} rows
                            </span>
                        )}
                    </h3>
                    <Link
                        href="/experiences/warehouse/railcam-history"
                        className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center gap-2"
                        style={{
                            backgroundColor: `${accentColor}15`,
                            color: accentColor,
                            border: `1px solid ${accentColor}30`,
                        }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        View History
                    </Link>
                </div>

                {/* Table content */}
                <div className="flex-1 min-h-0 overflow-auto px-2">
                    {scanLoading && (
                        <div className="flex items-center justify-center py-8">
                            <AppLoading message="Loading scan data..." />
                        </div>
                    )}

                    {!scanLoading && scanData.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke={colors.textMuted} strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                                <p className="text-sm" style={{ color: colors.textMuted }}>
                                    No scan data yet. Run an Auto Scan to detect pallets.
                                </p>
                            </div>
                        </div>
                    )}

                    {!scanLoading && scanData.length > 0 && (
                        <DataTable columns={scanColumns} data={scanData} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default WarehouseRailCamTab;
