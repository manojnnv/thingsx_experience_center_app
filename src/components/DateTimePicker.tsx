"use client";

import * as React from "react";
import { DateRangePicker } from "rsuite";

import { colors } from "@/config/theme";
import "./datePicker.css";

interface DateTimePickerProps {
  className?: string;
  accentColor?: string;
  onChange?: (value: Date[] | null) => void;
  onSubmit?: () => void;
}

export default function DateTimePicker({
  className,
  accentColor,
  onChange,
  onSubmit,
}: DateTimePickerProps) {
  const defaultRange: [Date, Date] = React.useMemo(() => {
    const endTime = new Date();
    const startTime = new Date(endTime);
    startTime.setHours(0, 0, 0, 0);
    return [startTime, endTime];
  }, []);

  const accent = accentColor || colors.primary;
  const themeStyle: React.CSSProperties = {
    ["--datepicker-bg" as any]: colors.background,
    ["--datepicker-popup-bg" as any]: colors.backgroundCard,
    ["--datepicker-foreground" as any]: colors.text,
    ["--datepicker-border" as any]: colors.border,
    ["--datepicker-hover" as any]: `${colors.border}60`,
    ["--datepicker-active-bg" as any]: accent,
    ["--datepicker-active-fg" as any]: colors.background,
    ["--datepicker-range-bg" as any]: `${accent}33`,
    ["--datepicker-range-fg" as any]: colors.text,
    ["--datepicker-range-hover-bg" as any]: `${accent}55`,
    ["--datepicker-shadow" as any]: `${accent}33`,

    // Rsuite theme variables (override input/toggle + accent colors)
    ["--rs-text-primary" as any]: colors.text,
    ["--rs-text-secondary" as any]: colors.text,
    ["--rs-text-tertiary" as any]: colors.text,
    ["--rs-text-heading" as any]: colors.text,
    ["--rs-text-inverse" as any]: colors.background,
    ["--rs-input-bg" as any]: colors.background,
    ["--rs-input-disabled-bg" as any]: colors.backgroundCard,
    ["--rs-border-primary" as any]: colors.border,
    ["--rs-border-secondary" as any]: colors.border,
    ["--rs-input-focus-border" as any]: accent,
    ["--rs-primary-500" as any]: accent,
    ["--rs-primary-600" as any]: accent,
    ["--rs-primary-700" as any]: accent,
    ["--rs-text-active" as any]: accent,
    ["--rs-bg-active" as any]: `${accent}33`,
    ["--rs-btn-default-bg" as any]: accent,
    ["--rs-btn-default-text" as any]: colors.background,
    ["--rs-btn-default-hover-bg" as any]: accent,
    ["--rs-btn-default-active-bg" as any]: accent,
    ["--rs-bg-well" as any]: colors.background,
    ["--rs-bg-card" as any]: colors.backgroundCard,
  };

  return (
    <div className={`w-full flex flex-wrap items-center gap-3 ${className || ""}`} style={themeStyle}>
      <DateRangePicker
        placement="auto"
        placeholder="Start date - End date"
        defaultValue={defaultRange}
        onChange={(value: Date[] | null) => {
          if (onChange) {
            onChange(value ?? null);
          }
        }}
        format="MM/dd/yyyy HH:mm"
      />
      <button
        onClick={onSubmit}
        className="px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-85"
        style={{ backgroundColor: accent, color: colors.background }}
      >
        Apply
      </button>
    </div>
  );
}
