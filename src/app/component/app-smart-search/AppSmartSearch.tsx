"use client";

import React, { useState, useRef, useEffect } from "react";
import { colors } from "@/config/theme";

type SmartSearchProps = {
  columns: any;
  rows: any;
  onFilteredData?: (rows: any[]) => void;
  onSearchText?: (text: string) => void;
  excludeColumns?: string[];
  initialSearch?: string;
};

export default function AppSmartSearch({
  columns,
  rows,
  onFilteredData,
  onSearchText,
  excludeColumns,
  initialSearch,
}: SmartSearchProps) {
  const [focused, setFocused] = useState(false);
  const [filters, setFilters] = useState<
    { column?: string; value?: string; label?: string }[]
  >([]);
  const hideTimeoutRef = useRef<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [selectedColumnLabel, setSelectedColumnLabel] = useState("");
  const [rowsOpen, setRowsOpen] = useState(false);
  const [typedSegment, setTypedSegment] = useState("");

  const prettify = (input: string) => {
    if (!input) return "";
    let s = input.replace(/[_-]+/g, " ");
    s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
    s = s.replace(/\s+/g, " ").trim();
    return s
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const columnsLabelValue: { label: string; value: string }[] = (columns || [])
    .map((item: any, i: number) => {
      const rawHeader = item?.header;
      const fallback = String(item?.accessorKey ?? item?.id ?? `col_${i}`);
      const source =
        typeof rawHeader === "string" && rawHeader.trim()
          ? rawHeader
          : fallback;
      return {
        label: prettify(String(source)),
        value: String(item?.accessorKey ?? item?.id ?? i),
      };
    })
    .filter((c: any) => {
      if (!excludeColumns || excludeColumns.length === 0) return true;
      const ex = (excludeColumns || []).map((x) => String(x).toLowerCase());
      return !(
        ex.includes(String(c.label).toLowerCase()) ||
        ex.includes(String(c.value).toLowerCase())
      );
    });

  const formatFiltersAsString = (
    filt: { column?: string; value?: string; label?: string }[]
  ) => {
    return (
      filt
        .map((f) => {
          const label =
            f.label ??
            columnsLabelValue.find((c) => c.value === f.column)?.label ??
            "";
          return label && f.value ? `${label} : ${f.value}` : null;
        })
        .filter(Boolean)
        .join("; ") + (filt.length > 0 ? "; " : "")
    );
  };

  const lastSentRef = useRef<string | null>(null);

  const getFieldValue = (obj: any, path?: string) => {
    if (!path) return undefined;
    try {
      return String(path)
        .split(".")
        .reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    if (!initialSearch) return;
    const initial = String(initialSearch || "").trim();
    if (!initial) return;
    if (!typedSegment || String(typedSegment).trim() === "") {
      setTypedSegment(initial);
      if ((!filters || filters.length === 0) && onSearchText) {
        onSearchText(initial);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  useEffect(() => {
    if (!onFilteredData) return;

    const send = (payloadRows: any[]) => {
      try {
        const key = JSON.stringify(payloadRows);
        if (lastSentRef.current === key) return;
        lastSentRef.current = key;
      } catch {
        // fall through
      }
      onFilteredData(payloadRows);
    };

    if (!filters || filters.length === 0) {
      const q = String(typedSegment || "").trim();
      if (onSearchText) onSearchText(q);
      send(rows || []);
      return;
    }

    const grouped: Record<string, Set<string>> = (filters || []).reduce(
      (acc: Record<string, Set<string>>, f) => {
        if (!f || !f.column) return acc;
        const col = String(f.column);
        acc[col] = acc[col] || new Set<string>();
        acc[col].add(String(f.value ?? ""));
        return acc;
      },
      {}
    );

    const filtered = (rows || []).filter((r: any) => {
      return Object.keys(grouped).every((col) => {
        const raw = getFieldValue(r, col);
        const rv = String(raw ?? "");
        const allowed = grouped[col];
        return Array.from(allowed).some((v) => String(v) === rv);
      });
    });

    send(filtered);
  }, [filters, rows, typedSegment, onFilteredData, onSearchText]);

  return (
    <div className="w-full flex gap-2 items-start">
      <div className="flex-1 relative">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all"
          style={{
            backgroundColor: colors.backgroundCard,
            border: `1px solid ${focused ? colors.primary : colors.border}`,
          }}
        >
          {filters.map((f, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${colors.primary}20`,
                color: colors.text,
              }}
            >
              <span className="font-medium">{f.label}</span>
              <span style={{ color: colors.textMuted }}>:</span>
              <span className="ml-1">{f.value}</span>
              <button
                className="ml-1 cursor-pointer text-xs"
                style={{ color: colors.primary }}
                onClick={() => {
                  const remaining = filters.filter((_, i) => i !== idx);
                  setFilters(remaining);
                  setTypedSegment("");
                  if (onSearchText) onSearchText("");
                }}
              >
                x
              </button>
            </div>
          ))}
          <input
            type="text"
            placeholder="Search..."
            value={typedSegment}
            className="flex-1 bg-transparent outline-none text-sm min-w-[80px]"
            style={{ color: colors.text }}
            onChange={(e) => {
              const v = e.target.value;
              setTypedSegment(v);
              if ((!filters || filters.length === 0) && onSearchText) {
                onSearchText(v);
              }
              const colonIdx = v.indexOf(":");
              if (colonIdx !== -1) {
                const left = v.slice(0, colonIdx).trim();
                const right = v.slice(colonIdx + 1).trim();
                const matched = columnsLabelValue.find(
                  (c) => String(c.label) === left
                );
                if (matched && right.length === 0) {
                  setSelectedColumn(matched.value);
                  setSelectedColumnLabel(matched.label);
                  setRowsOpen(true);
                }
              }
            }}
            onFocus={() => {
              if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
              }
              setFocused(true);
            }}
            onBlur={() => {
              hideTimeoutRef.current = window.setTimeout(() => {
                setFocused(false);
                hideTimeoutRef.current = null;
              }, 150);
            }}
          />
        </div>

        {focused && !rowsOpen && String(typedSegment || "").trim() === "" && (
          <div
            className="absolute left-0 top-full mt-1 w-[30%] shadow rounded p-2 max-h-48 overflow-y-auto z-50 cursor-pointer"
            style={{
              backgroundColor: colors.backgroundElevated,
              border: `1px solid ${colors.border}`,
            }}
            onMouseEnter={() => {
              if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
              }
              setFocused(true);
            }}
            onMouseLeave={() => {
              hideTimeoutRef.current = window.setTimeout(() => {
                setFocused(false);
                hideTimeoutRef.current = null;
              }, 150);
            }}
          >
            {columnsLabelValue?.map((item) => (
              <div
                key={item.value}
                className="py-1 px-2 cursor-pointer rounded text-sm"
                style={{
                  color: colors.text,
                  ...(selectedColumn === item.value
                    ? { backgroundColor: `${colors.primary}30` }
                    : {}),
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = `${colors.primary}15`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    selectedColumn === item.value
                      ? `${colors.primary}30`
                      : "transparent";
                }}
                onClick={() => {
                  setSelectedColumn(item.value);
                  setSelectedColumnLabel(item.label);
                  setTypedSegment(`${item.label} : `);
                  setFocused(false);
                  setRowsOpen(true);
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}

        {rowsOpen && selectedColumn && (
          <div
            className="absolute left-0 top-full mt-1 w-64 shadow rounded p-2 max-h-56 overflow-y-auto z-50"
            style={{
              backgroundColor: colors.backgroundElevated,
              border: `1px solid ${colors.border}`,
            }}
            onMouseEnter={() => {
              if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
              }
              setRowsOpen(true);
            }}
            onMouseLeave={() => {
              hideTimeoutRef.current = window.setTimeout(() => {
                setRowsOpen(false);
                hideTimeoutRef.current = null;
              }, 150);
            }}
          >
            <div
              className="mb-2 font-medium text-sm"
              style={{ color: colors.text }}
            >
              {selectedColumnLabel}
            </div>
            {(rows || []).length === 0 ? (
              <div className="text-sm" style={{ color: colors.textMuted }}>
                No data
              </div>
            ) : (
              (() => {
                const vals: string[] = (rows || [])
                  .map((r: any) => r?.[selectedColumn])
                  .filter((v: any) => v !== undefined && v !== null)
                  .map((v: any) => String(v));
                const uniq: string[] = Array.from(new Set(vals));
                if (uniq.length === 0)
                  return (
                    <div
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      No values
                    </div>
                  );
                return uniq.map((v, idx) => (
                  <div
                    key={idx}
                    className="py-1 px-2 cursor-pointer rounded text-sm"
                    style={{ color: colors.text }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = `${colors.primary}15`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                    onClick={() => {
                      const newFilters = [
                        ...filters,
                        {
                          column: selectedColumn!,
                          value: v,
                          label: selectedColumnLabel,
                        },
                      ];
                      setFilters(newFilters);
                      setTypedSegment("");
                      if (onSearchText) onSearchText("");
                      setRowsOpen(false);
                      setSelectedColumn(null);
                      setSelectedColumnLabel("");
                    }}
                  >
                    {v}
                  </div>
                ));
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
