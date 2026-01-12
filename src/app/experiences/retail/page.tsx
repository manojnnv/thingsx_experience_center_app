"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { colors } from "@/config/theme";
import { 
  retailESLDevices, 
  epdColorMap, 
  ESLConfig, 
} from "@/config/devices";
import { updateEPDValue, bulkUpdateEPD, BulkUpdatePayload } from "@/app/services/epd/epd";
import { Toaster } from "sonner";

// ESL field values state
interface ESLFieldValues {
  [tin: string]: {
    [fieldKey: string]: string | number;
  };
}

export default function RetailExperiencePage() {
  const [showVideo, setShowVideo] = useState(true);
  
  // ESL state
  const [eslValues, setEslValues] = useState<ESLFieldValues>({});
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [bulkFieldKey, setBulkFieldKey] = useState("");
  const [bulkFieldValue, setBulkFieldValue] = useState("");
  const [updating, setUpdating] = useState(false);

  // Initialize ESL values from config
  useEffect(() => {
    const initialValues: ESLFieldValues = {};
    retailESLDevices.forEach((esl) => {
      initialValues[esl.tin] = {};
      esl.productFields.forEach((field) => {
        initialValues[esl.tin][field.key] = field.defaultValue ?? "";
      });
    });
    setEslValues(initialValues);
  }, []);

  const skipVideo = () => setShowVideo(false);

  // ESL value handlers
  const handleESLFieldChange = (tin: string, fieldKey: string, value: string | number) => {
    setEslValues((prev) => ({
      ...prev,
      [tin]: {
        ...prev[tin],
        [fieldKey]: value,
      },
    }));
  };

  const handleUpdateSingleESL = async (esl: ESLConfig) => {
    setUpdating(true);
    try {
      const values = eslValues[esl.tin] || {};
      await updateEPDValue(esl.tin, values);
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkFieldKey || selectedForBulk.length === 0) return;
    
    setUpdating(true);
    try {
      const updates: BulkUpdatePayload[] = selectedForBulk.map((tin) => ({
        tin,
        [bulkFieldKey]: bulkFieldValue,
      }));
      await bulkUpdateEPD(updates);
      
      // Update local state
      setEslValues((prev) => {
        const newValues = { ...prev };
        selectedForBulk.forEach((tin) => {
          if (newValues[tin]) {
            newValues[tin][bulkFieldKey] = bulkFieldValue;
          }
        });
        return newValues;
      });
      
      // Reset bulk mode
      setSelectedForBulk([]);
      setBulkFieldKey("");
      setBulkFieldValue("");
      setBulkMode(false);
    } finally {
      setUpdating(false);
    }
  };

  const toggleBulkSelect = (tin: string) => {
    setSelectedForBulk((prev) =>
      prev.includes(tin) ? prev.filter((t) => t !== tin) : [...prev, tin]
    );
  };

  return (
    <div className="min-h-screen text-white relative" style={{ backgroundColor: colors.background }}>
      <Toaster position="top-right" richColors />

      {/* Video Intro Overlay */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
          <div className="relative w-full max-w-4xl mx-8">
            <div
              className="relative aspect-video rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: colors.backgroundCard, border: `2px solid ${colors.primary}30` }}
            >
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
                  <svg viewBox="0 0 24 24" fill={colors.primary} className="w-12 h-12">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>Retail Experience</h2>
                <p style={{ color: colors.textMuted }}>See how Electronic Shelf Labels transform retail operations</p>
              </div>
            </div>
            <button
              onClick={skipVideo}
              className="absolute bottom-6 right-6 px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
              style={{ backgroundColor: colors.primary, color: colors.background }}
            >
              <span>Skip Intro</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={showVideo ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
        {/* Header */}
        <header className="sticky top-0 z-40 px-8 py-4" style={{ backgroundColor: `${colors.background}ee`, backdropFilter: "blur(10px)" }}>
          <div className="flex items-center justify-between">
            <Link href="/experiences" className="inline-flex items-center gap-2 text-sm transition-colors duration-300 group" style={{ color: colors.textMuted }}>
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="group-hover:text-white">Back</span>
            </Link>
            <h1 className="text-xl font-bold" style={{ color: colors.primary }}>Retail Experience - ESL Demo</h1>
            <div className="w-20" />
          </div>
        </header>

        {/* Content Area */}
        <main className="px-8 py-6">
          {/* Intro Section */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4" style={{ color: colors.text }}>Electronic Shelf Labels</h2>
            <p className="max-w-2xl mx-auto" style={{ color: colors.textMuted }}>
              Experience the power of dynamic pricing and instant product updates. 
              Edit the values below and push updates to shelf labels in real-time.
            </p>
          </div>

          {/* Bulk Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl mb-6" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
            <div>
              <h3 className="font-semibold" style={{ color: colors.text }}>Bulk Price Update</h3>
              <p className="text-sm" style={{ color: colors.textMuted }}>Select multiple ESLs to update prices or product info at once</p>
            </div>
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedForBulk([]);
              }}
              className="px-4 py-2 rounded-lg font-medium transition-all duration-300"
              style={{
                backgroundColor: bulkMode ? colors.primary : colors.transparent,
                color: bulkMode ? colors.background : colors.primary,
                border: `1px solid ${colors.primary}`,
              }}
            >
              {bulkMode ? "Exit Bulk Mode" : "Enable Bulk Mode"}
            </button>
          </div>

          {/* Bulk Update Controls */}
          {bulkMode && selectedForBulk.length > 0 && (
            <div className="p-4 rounded-xl space-y-4 mb-6" style={{ backgroundColor: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
              <p className="text-sm font-medium" style={{ color: colors.primary }}>
                {selectedForBulk.length} ESL(s) selected
              </p>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: colors.textMuted }}>Field to Update</label>
                  <select
                    value={bulkFieldKey}
                    onChange={(e) => setBulkFieldKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.text }}
                  >
                    <option value="">Select field...</option>
                    {retailESLDevices[0]?.productFields.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: colors.textMuted }}>New Value</label>
                  <input
                    type="text"
                    value={bulkFieldValue}
                    onChange={(e) => setBulkFieldValue(e.target.value)}
                    placeholder="Enter value..."
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.text }}
                  />
                </div>
                <button
                  onClick={handleBulkUpdate}
                  disabled={updating || !bulkFieldKey}
                  className="px-6 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50"
                  style={{ backgroundColor: colors.primary, color: colors.background }}
                >
                  {updating ? "Updating..." : "Apply to All"}
                </button>
              </div>
            </div>
          )}

          {/* ESL Grid - Retail Shelf Simulation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {retailESLDevices.map((esl) => {
              const colorScheme = epdColorMap[esl.color];
              const isSelected = selectedForBulk.includes(esl.tin);
              const values = eslValues[esl.tin] || {};
              
              return (
                <div
                  key={esl.tin}
                  className="rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                    boxShadow: isSelected ? `0 0 30px ${colors.primary}30` : "none",
                  }}
                >
                  {/* Product Shelf Visual */}
                  <div className="p-6 relative" style={{ backgroundColor: "#2a2a2a" }}>
                    {/* Shelf Label */}
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      {bulkMode && (
                        <button
                          onClick={() => toggleBulkSelect(esl.tin)}
                          className="w-6 h-6 rounded border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: isSelected ? colors.primary : colors.textMuted,
                            backgroundColor: isSelected ? colors.primary : colors.transparent,
                          }}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4" fill={colors.background} viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Product placeholder box */}
                    <div className="h-28 mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#3a3a3a", border: "2px dashed #555" }}>
                      <svg className="w-12 h-12" fill={colors.textFaint} viewBox="0 0 24 24">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke={colors.textFaint} strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>

                    {/* ESL Display Preview */}
                    <div
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: colorScheme.bg,
                        border: `2px solid ${colorScheme.accent}`,
                        minHeight: esl.size === "large" ? "140px" : esl.size === "medium" ? "100px" : "80px",
                      }}
                    >
                      <p className="font-bold text-lg mb-1" style={{ color: colorScheme.text }}>
                        {values.product_name || "Product Name"}
                      </p>
                      {values.description && (
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: `${colorScheme.text}99` }}>
                          {values.description}
                        </p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold" style={{ color: esl.color === "red" ? "#ff4444" : esl.color === "yellow" ? "#ffd700" : colorScheme.text }}>
                          ${values.price || "0.00"}
                        </span>
                        {values.original_price && (
                          <span className="text-sm line-through" style={{ color: `${colorScheme.text}66` }}>
                            ${values.original_price}
                          </span>
                        )}
                      </div>
                      {values.promo && (
                        <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: esl.color === "red" ? "#ff4444" : esl.color === "yellow" ? "#ffd700" : colors.primary, color: "#000" }}>
                          {values.promo}
                        </span>
                      )}
                      {values.sku && (
                        <p className="text-xs mt-2 font-mono" style={{ color: `${colorScheme.text}66` }}>
                          SKU: {values.sku}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ESL Info */}
                  <div className="p-3 flex items-center justify-between" style={{ backgroundColor: colors.backgroundCard }}>
                    <div>
                      <p className="text-xs font-mono" style={{ color: colors.textMuted }}>{esl.tin}</p>
                      <p className="text-sm font-medium" style={{ color: colors.text }}>{esl.displayName}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${colorScheme.accent}30`, color: colorScheme.text === "#1a1a1a" ? colors.textMuted : colorScheme.text }}
                    >
                      {esl.size} • {esl.color}
                    </span>
                  </div>

                  {/* Edit Fields */}
                  <div className="p-4 space-y-3" style={{ backgroundColor: colors.backgroundCard, borderTop: `1px solid ${colors.border}` }}>
                    {esl.productFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs mb-1" style={{ color: colors.textMuted }}>{field.label}</label>
                        <input
                          type={field.type === "price" ? "number" : "text"}
                          step={field.type === "price" ? "0.01" : undefined}
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleESLFieldChange(esl.tin, field.key, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2"
                          style={{
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                            color: colors.text,
                          }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => handleUpdateSingleESL(esl)}
                      disabled={updating}
                      className="w-full py-2 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50"
                      style={{ backgroundColor: colors.primary, color: colors.background }}
                    >
                      {updating ? "Updating..." : "Push to Label"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
