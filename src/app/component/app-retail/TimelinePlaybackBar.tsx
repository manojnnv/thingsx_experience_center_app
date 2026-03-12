"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { colors } from "@/config/theme";

interface TimelinePlaybackBarProps {
  segmentCount: number;
  segmentIntensities: number[];
  segmentLabels: string[];
  activeSegment: number | null;
  onSegmentChange: (index: number) => void;
  onShowAll: () => void;
  disabled?: boolean;
}

export default function TimelinePlaybackBar({
  segmentCount,
  segmentIntensities,
  segmentLabels,
  activeSegment,
  onSegmentChange,
  onShowAll,
  disabled = false,
}: TimelinePlaybackBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSegmentRef = useRef(activeSegment);
  const segmentCountRef = useRef(segmentCount);

  useEffect(() => {
    activeSegmentRef.current = activeSegment;
  }, [activeSegment]);

  useEffect(() => {
    segmentCountRef.current = segmentCount;
  }, [segmentCount]);

  useEffect(() => {
    if (!isPlaying || disabled || segmentCount === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const ms = 2000 / speed;
    intervalRef.current = setInterval(() => {
      const current = activeSegmentRef.current ?? -1;
      const next = current + 1;
      if (next >= segmentCountRef.current) {
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onSegmentChange(0);
        return;
      }
      onSegmentChange(next);
    }, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, speed, disabled, segmentCount, onSegmentChange]);

  useEffect(() => {
    if (disabled) setIsPlaying(false);
  }, [disabled]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onSegmentChange(Number(e.target.value));
    },
    [onSegmentChange]
  );

  const togglePlay = useCallback(() => {
    if (disabled || segmentCount === 0) return;
    if (
      !isPlaying &&
      (activeSegment === null || activeSegment >= segmentCount - 1)
    ) {
      onSegmentChange(0);
    }
    setIsPlaying((prev) => !prev);
  }, [disabled, segmentCount, isPlaying, activeSegment, onSegmentChange]);

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onShowAll();
  }, [onShowAll]);

  const labelFontSize = segmentCount <= 24 ? "text-[11px]" : "text-[9px]";
  const sliderValue = activeSegment ?? 0;

  const thumbWidth = 12;
  const halfSegPct = segmentCount > 0 ? 50 / segmentCount : 0;
  const travelPct = segmentCount > 1 ? ((segmentCount - 1) / segmentCount) * 100 : 0;

  return (
    <div
      className="flex flex-col gap-1.5 rounded-md p-2"
      style={{ border: `1px solid ${colors.text}` }}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={disabled || segmentCount === 0}
          className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-40"
          style={{ backgroundColor: colors.primary, color: colors.background }}
        >
          {isPlaying ? <Pause size={11} /> : <Play size={11} />}
        </button>

        <button
          type="button"
          onClick={cycleSpeed}
          disabled={disabled}
          className="px-1.5 h-6 flex items-center justify-center rounded-md text-[10px] font-semibold disabled:opacity-40"
          style={{
            backgroundColor: colors.backgroundElevated,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {speed}x
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-40"
          style={{
            backgroundColor: colors.backgroundElevated,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          <RotateCcw size={11} />
        </button>

        <div className="h-4 w-px" style={{ backgroundColor: colors.border }} />

        <span className="text-xs" style={{ color: colors.text }}>
          {activeSegment !== null && segmentLabels[activeSegment]
            ? segmentLabels[activeSegment]
            : "All"}
        </span>

        <button
          type="button"
          onClick={activeSegment !== null ? onShowAll : () => onSegmentChange(0)}
          disabled={disabled}
          className="ml-auto px-2 h-6 flex items-center justify-center rounded-md text-[10px] font-semibold disabled:opacity-40"
          style={{
            backgroundColor: activeSegment !== null ? colors.primary : colors.backgroundElevated,
            color: activeSegment !== null ? colors.background : colors.text,
            border: `1px solid ${activeSegment !== null ? colors.primary : colors.border}`,
          }}
        >
          {activeSegment !== null ? "Show Total" : "Hide Total"}
        </button>
      </div>

      <div className="relative">
        <div
          className="h-2 rounded-full"
          style={{ backgroundColor: colors.border }}
        />

        <input
          type="range"
          min={0}
          max={Math.max(segmentCount - 1, 0)}
          value={sliderValue}
          onChange={handleSliderChange}
          disabled={disabled || segmentCount === 0}
          className="timeline-slider absolute h-2 cursor-pointer disabled:cursor-not-allowed"
          style={{
            appearance: "none",
            background: "transparent",
            margin: 0,
            top: 0,
            left: `calc(${halfSegPct}% - ${thumbWidth / 2}px)`,
            width: `calc(${travelPct}% + ${thumbWidth}px)`,
          }}
        />
      </div>

      <div className="flex">
        {Array.from({ length: segmentCount }, (_, i) => (
          <div key={i} className="flex-1 text-center" style={{ minWidth: 0 }}>
            <span
              className={`${labelFontSize} truncate block`}
                style={{ color: colors.text }}
            >
              {segmentLabels[i] ?? ""}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: ${colors.primary};
          border: 2px solid ${colors.background};
          border-radius: 50%;
          cursor: pointer;
          margin-top: -2px;
        }
        .timeline-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: ${colors.primary};
          border: 2px solid ${colors.background};
          border-radius: 50%;
          cursor: pointer;
        }
        .timeline-slider::-webkit-slider-runnable-track {
          background: transparent;
          height: 8px;
        }
        .timeline-slider::-moz-range-track {
          background: transparent;
          height: 8px;
        }
      `}</style>
    </div>
  );
}
