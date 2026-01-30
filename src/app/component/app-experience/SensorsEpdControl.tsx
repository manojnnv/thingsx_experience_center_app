"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { colors } from "@/config/theme";
import type { EPDConfig } from "@/config/devices";
import type { EPDFieldValues } from "./types";
import { fetchTemplatePreview } from "@/app/services/epd/templatePreview";
import { fetchTemplateMapping } from "@/app/services/epd/templateMapping";

function SensorsEpdControl({
  sensorEPDDevices,
  epdColorMap,
  epdValues,
  updating,
  onEPDFieldChange,
  onUpdateSingleEPD,
  accentColor,
}: {
  sensorEPDDevices: EPDConfig[];
  epdColorMap: Record<string, { bg: string; text: string; accent: string }>;
  epdValues: EPDFieldValues;
  updating: boolean;
  onEPDFieldChange: (tin: string, fieldKey: string, value: string | number) => void;
  onUpdateSingleEPD: (epd: EPDConfig) => void;
  accentColor?: string;
}) {
  const accent = accentColor || colors.yellow;
  const [previewByTin, setPreviewByTin] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});
  const [previewError, setPreviewError] = useState<Record<string, string>>({});
  const [templateIdByTin, setTemplateIdByTin] = useState<Record<string, number>>({});

  const previewTargets = useMemo(() => {
    return sensorEPDDevices
      .map((epd) => {
        const mappedId = templateIdByTin[epd.tin];
        const fallbackId = typeof epd.templateId === "number" ? epd.templateId : undefined;
        return {
          ...epd,
          resolvedTemplateId: mappedId ?? fallbackId,
        };
      })
      .filter((epd) => typeof epd.resolvedTemplateId === "number");
  }, [sensorEPDDevices, templateIdByTin]);

  const resolveTemplateId = useCallback(
    async (epd: EPDConfig) => {
      if (templateIdByTin[epd.tin]) return templateIdByTin[epd.tin];
      const mappingResult = await fetchTemplateMapping(epd.tin);
      const mappedId = mappingResult.data?.data?.[0]?.template_id;
      if (typeof mappedId === "number") {
        setTemplateIdByTin((prev) => ({ ...prev, [epd.tin]: mappedId }));
        return mappedId;
      }
      if (typeof epd.templateId === "number") {
        setTemplateIdByTin((prev) => ({ ...prev, [epd.tin]: epd.templateId as number }));
        return epd.templateId;
      }
      return undefined;
    },
    [templateIdByTin]
  );

  const refreshPreview = useCallback(
    async (epd: EPDConfig) => {
      const resolvedId = await resolveTemplateId(epd);
      if (typeof resolvedId !== "number") return;

      setPreviewLoading((prev) => ({ ...prev, [epd.tin]: true }));
      setPreviewError((prev) => ({ ...prev, [epd.tin]: "" }));
      const previewResult = await fetchTemplatePreview(resolvedId);
      if (previewResult.error) {
        setPreviewError((prev) => ({
          ...prev,
          [epd.tin]: previewResult.error || "Preview failed",
        }));
        setPreviewLoading((prev) => ({ ...prev, [epd.tin]: false }));
        return;
      }
      const data = previewResult.data;
      if (data?.image_base64) {
        const format = data.image_format || "png";
        setPreviewByTin((prev) => ({
          ...prev,
          [epd.tin]: `data:image/${format};base64,${data.image_base64}`,
        }));
      } else {
        setPreviewError((prev) => ({
          ...prev,
          [epd.tin]: "No preview available",
        }));
      }
      setPreviewLoading((prev) => ({ ...prev, [epd.tin]: false }));
    },
    [resolveTemplateId]
  );

  useEffect(() => {
    sensorEPDDevices.forEach((epd) => {
      if (templateIdByTin[epd.tin]) return;
      resolveTemplateId(epd);
    });
  }, [sensorEPDDevices, templateIdByTin, resolveTemplateId]);

  useEffect(() => {
    if (previewTargets.length === 0) return;

    previewTargets.forEach((epd) => {
      if (previewByTin[epd.tin] || previewLoading[epd.tin]) return;
      refreshPreview(epd);
    });
  }, [previewTargets, previewByTin, previewLoading, refreshPreview]);

  const handleUpdateAndRefresh = useCallback(
    async (epd: EPDConfig) => {
      await onUpdateSingleEPD(epd);
      await refreshPreview(epd);
    },
    [onUpdateSingleEPD, refreshPreview]
  );

  return (
    <div className="space-y-6">
      {/* EPD Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sensorEPDDevices.map((epd) => {
          const colorScheme = epdColorMap[epd.color];
          
          return (
            <div key={epd.tin} className="rounded-xl overflow-hidden transition-all duration-300" style={{ border: `1px solid ${colors.border}` }}>
              {/* Header */}
              <div className="p-3 flex items-center justify-between" style={{ backgroundColor: colors.backgroundCard }}>
                <div>
                  <p className="text-xs font-mono" style={{ color: colors.textMuted }}>{epd.tin}</p>
                  <p className="text-sm font-medium" style={{ color: colors.text }}>{epd.displayName}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${colorScheme.accent}30`, color: colorScheme.text }}>{epd.size} • {epd.color}</span>
              </div>

              {/* Preview */}
              <div className="p-4 flex items-center justify-center" style={{ backgroundColor: colorScheme.bg, minHeight: epd.size === "large" ? "180px" : epd.size === "medium" ? "120px" : "100px" }}>
                {previewLoading[epd.tin] && (
                  <div className="text-xs" style={{ color: colors.textMuted }}>
                    Loading preview...
                  </div>
                )}
                {!previewLoading[epd.tin] && previewByTin[epd.tin] && (
                  <img
                    src={previewByTin[epd.tin]}
                    alt={`${epd.displayName} template preview`}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
                {!previewLoading[epd.tin] && !previewByTin[epd.tin] && (
                  <div className="text-center">
                    {epd.fields.slice(0, 3).map((field) => (
                      <p key={field.key} className={field.key === "title" || field.key === "header" ? "text-lg font-bold" : "text-sm"} style={{ color: colorScheme.text }}>
                        {epdValues[epd.tin]?.[field.key] || field.defaultValue || "--"}
                      </p>
                    ))}
                    {previewError[epd.tin] && (
                      <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
                        {previewError[epd.tin]}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Edit Fields */}
              <div className="p-4 space-y-3" style={{ backgroundColor: colors.backgroundCard }}>
                {epd.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs mb-1" style={{ color: colors.textMuted }}>{field.label}</label>
                    <input type={field.type === "number" || field.type === "price" ? "number" : "text"} value={epdValues[epd.tin]?.[field.key] ?? ""} onChange={(e) => onEPDFieldChange(epd.tin, field.key, e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.text }} />
                  </div>
                ))}
                <button
                  onClick={() => refreshPreview(epd)}
                  disabled={previewLoading[epd.tin]}
                  className="w-full py-2 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50"
                  style={{ backgroundColor: "transparent", color: accent, border: `1px solid ${accent}40` }}
                >
                  {previewLoading[epd.tin] ? "Refreshing..." : "Refresh Preview"}
                </button>
                <button onClick={() => handleUpdateAndRefresh(epd)} disabled={updating} className="w-full py-2 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50" style={{ backgroundColor: accent, color: colors.background }}>
                  {updating ? "Updating..." : "Update EPD"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SensorsEpdControl;
