"use client";

import React, { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import { DataTable } from "@/app/component/app-data-table/data-table";
import DateTimePicker from "@/app/component/date-time-picker/DateTimePicker";
import AppLoading from "@/app/component/app-loading/AppLoading";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import VideoLibraryButton from "@/app/component/app-video-library/VideoLibraryButton";
import { Button } from "@/app/components/ui/button";
import { getRailcamDetails } from "@/app/services/railcam/railcam";
import { formatDateAndTime } from "@/app/utils/dateTime";

const accentColor = colors.warehouseAccent;

function RailcamHistoryContent() {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState<string[]>([]);
    const [scanData, setScanData] = useState<Record<string, unknown>[]>([]);
    const [scanColumns, setScanColumns] = useState<ColumnDef<any>[]>([]);

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

    const handleDateChange = (date: any) => {
        const isoDates = formatDateAndTime(date);
        setDateRange(isoDates);
    };

    const handleSubmit = async () => {
        if (dateRange.length < 2) return;
        setLoading(true);
        try {
            const result = await getRailcamDetails(dateRange[0], dateRange[1]);
            if (result.data && result.data.length > 0) {
                const keys = Object.keys(result.data[0]);
                setScanColumns(generateColumns(keys));
                setScanData(result.data);
            } else {
                setScanData([]);
                setScanColumns([]);
            }
        } catch {
            // Error handled by service
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen text-white flex flex-col"
            style={{ backgroundColor: colors.background }}
        >
            {/* Header */}
            <header
                className="sticky top-0 z-40 px-8 py-4"
                style={{
                    backgroundColor: `${colors.background}ee`,
                    backdropFilter: "blur(10px)",
                }}
            >
                <div className="flex justify-between items-center">
                    <Link
                        href="/experiences/warehouse"
                        className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group"
                        style={{ color: colors.textMuted }}
                    >
                        <svg
                            className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="group-hover:text-white">Back</span>
                    </Link>
                    <h1 className="text-xl font-bold" style={{ color: accentColor }}>
                        Rail Cam History
                    </h1>
                    <div className="w-20" />
                </div>
            </header>

            {/* Controls */}
            <div className="px-8 py-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold" style={{ color: accentColor }}>
                        Scan History
                    </div>
                    <div className="flex items-end gap-3">
                        <DateTimePicker
                            onchange={handleDateChange}
                            onsubmit={handleSubmit}
                        />
                    </div>
                </div>
            </div>

            {/* Data table */}
            <div className="px-8 flex-1">
                <div
                    className="rounded-lg relative"
                    style={{
                        backgroundColor: colors.backgroundCard,
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    {loading && (
                        <div
                            className="absolute inset-0 flex items-center justify-center z-50 rounded-lg"
                            style={{ backgroundColor: `${colors.background}cc` }}
                        >
                            <AppLoading message="Loading scan history..." />
                        </div>
                    )}

                    {!loading && scanData.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke={colors.textMuted} strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm" style={{ color: colors.textMuted }}>
                                    Select a date range and click Submit to view historical scan data.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <DataTable columns={scanColumns} data={scanData} />
                    )}
                </div>
            </div>
            <VideoLibraryButton />
        </div>
    );
}

function RailcamHistoryFallback() {
    return (
        <div
            className="min-h-screen text-white flex items-center justify-center"
            style={{ backgroundColor: colors.background }}
        >
            <span style={{ color: colors.textMuted }}>Loading...</span>
        </div>
    );
}

export default function RailcamHistoryPage() {
    return (
        <Suspense fallback={<RailcamHistoryFallback />}>
            <RailcamHistoryContent />
        </Suspense>
    );
}
