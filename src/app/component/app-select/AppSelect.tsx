"use client";

import React from "react";
import { colors } from "@/config/theme";

export interface SelectOption {
  label: string;
  value: string;
}

interface AppSelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onchange?: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function AppSelect({
  label,
  options,
  value,
  onchange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}: AppSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onchange?.(val || undefined);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          className="text-sm font-medium"
          style={{ color: colors.textMuted }}
        >
          {label}
        </label>
      )}
      <select
        value={value || ""}
        onChange={handleChange}
        disabled={disabled}
        className="px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 cursor-pointer"
        style={{
          backgroundColor: colors.backgroundCard,
          border: `1px solid ${colors.border}`,
          color: colors.text,
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default AppSelect;
