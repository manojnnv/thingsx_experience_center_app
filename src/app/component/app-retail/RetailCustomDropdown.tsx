"use client";

import React, { useEffect, useRef, useState } from "react";
import { colors } from "@/config/theme";
import type { DropdownOption } from "./types";

function RetailCustomDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
  accent,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  accent: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm mb-2 font-medium" style={{ color: colors.textMuted }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between gap-2 group"
        style={{
          backgroundColor: isOpen ? `${accent}10` : colors.background,
          border: `2px solid ${isOpen ? accent : colors.border}`,
          color: selectedOption ? colors.text : colors.textMuted,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke={isOpen ? accent : colors.textMuted}
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div
          className="absolute z-50 mt-2 w-full rounded-xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: colors.backgroundCard,
            border: `2px solid ${accent}40`,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-center" style={{ color: colors.textMuted }}>
              No options available
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left transition-all flex items-center gap-3 group"
                style={{
                  backgroundColor: option.value === value ? `${accent}20` : "transparent",
                  color: colors.text,
                }}
                onMouseEnter={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = `${accent}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: option.value === value ? accent : "transparent",
                    border: `2px solid ${option.value === value ? accent : colors.border}`,
                  }}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default RetailCustomDropdown;
