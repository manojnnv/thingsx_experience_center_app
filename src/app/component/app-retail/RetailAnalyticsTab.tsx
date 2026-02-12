"use client";

import React, { useEffect, useRef, useState } from "react";
import { FabricJSCanvas, useFabricJSEditor } from "fabricjs-react";
import * as fabric from "fabric";
import { Minus, Plus, RotateCcw, SquareSquare } from "lucide-react";
import { colors } from "@/config/theme";
import AppTooltip from "@/app/component/app-tooltip/AppTooltip";
import AppIconButton from "@/app/component/app-icon-button/AppIconButton";
import AppSheet from "@/app/component/app-sheet/AppSheet";
import DateTimePicker from "@/app/component/date-time-picker/DateTimePicker";
import { zoneCountHeatMap, productInteraction } from "@/app/services/heatmap/heatMap";
import { getLayout } from "@/lib/layout";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";
import { getSiteId } from "@/config/site";

const HEATMAP_GRADIENT = ["#2196f3", "#00bcd4", "#4caf50", "#ffd54f", "#ffa000", "#ff3b30"];

type ZoneSelection = { id: string | null; name: string | null };

function formatDateAndTime(range: Date[] | null): string[] {
  if (!range || range.length < 2) return ["", ""];
  return [range[0].toISOString(), range[1].toISOString()];
}

function HeatmapLegend({
  min = 0,
  max = 0,
  gradientColors = HEATMAP_GRADIENT,
}: {
  min?: number;
  max?: number;
  gradientColors?: string[];
}) {
  const legendColors =
    gradientColors && gradientColors.length > 0
      ? [...gradientColors].reverse()
      : [...HEATMAP_GRADIENT].reverse();
  const gradient = `linear-gradient(90deg, ${legendColors.join(", ")})`;
  return (
    <div
      aria-hidden
      className="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 rounded-md px-3 py-2 text-xs"
      style={{ backgroundColor: `${colors.background}ee`, color: colors.text }}
    >
      <div className="flex items-center gap-2">
        <span>{max}</span>
        <div className="h-2 w-40 rounded-md" style={{ background: gradient }} />
        <span>{min}</span>
      </div>
    </div>
  );
}

function HeatmapView({
  mode,
  accent,
}: {
  mode: "zone" | "product";
  accent: string;
}) {
  const isProduct = mode === "product";
  const [loading, setLoading] = useState(false);
  const { editor, onReady } = useFabricJSEditor();
  const [zoom, setZoom] = useState(1);
  const [dateAndTime, setDateAndTime] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<any>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneSelection>({
    id: null,
    name: null,
  });
  const [selectedZoneData, setSelectedZoneData] = useState<any | any[] | null>(null);
  const [heatMapData, setHeatMapData] = useState<any[]>([]);
  const [heatmapRange, setHeatmapRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 0,
  });
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    zoneName: string;
    count: number | null;
    zoneId: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    zoneName: "",
    count: null,
    zoneId: "",
  });

  const getCountValue = (h: any) => {
    const v = isProduct
      ? h?.interaction_count ?? h?.interactionCount ?? h?.count ?? h?.value ?? h?.total ?? h?.sum
      : h?.visitor_count ?? h?.visitorCount ?? h?.count ?? h?.value ?? h?.total ?? h?.sum;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const normalizeSource = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
  };

  const hexToRgb = (hex: string) => {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  const applyHeatmap = (data?: any[], opts?: { colors?: string[]; alpha?: number }) => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const palette = opts?.colors ?? HEATMAP_GRADIENT;
    const alpha = typeof opts?.alpha === "number" ? opts.alpha : 0.7;
    const sourceData = normalizeSource(data ?? heatMapData);
    if (!sourceData || sourceData.length === 0) return;

    const existingOverlays = canvas.getObjects().filter((o: any) => o.isHeatmapOverlay);
    existingOverlays.forEach((o: any) => {
      try { canvas.remove(o); } catch { }
    });

    const floorplan = canvas.getObjects().find((o: any) => o.isLayout || o.type === "image");
    if (!floorplan) return;

    const layoutBounds = (floorplan as any).getBoundingRect(true);
    const layoutLeft = layoutBounds.left;
    const layoutTop = layoutBounds.top;
    const layoutWidth = layoutBounds.width;
    const layoutHeight = layoutBounds.height;

    const numericCounts = sourceData.map((h: any) => getCountValue(h)).filter((n) => n !== null) as number[];
    const max = numericCounts.length > 0 ? Math.max(...numericCounts) : 0;
    const min = 0;
    setHeatmapRange({ min, max });

    const countMap = new Map<string, number>();
    sourceData.forEach((h: any) => {
      const zid = h?.zone_id ?? h?.zoneId ?? h?.id;
      const c = getCountValue(h);
      if (zid !== undefined && c !== null) countMap.set(String(zid), c);
    });

    const zoneHeatSpots: { x: number; y: number; count: number; intensity: number; radius: number }[] = [];
    const LABEL_FONT_SIZE = 24;
    const LABEL_BG_PADDING = 12;
    const LABEL_MIN_WIDTH = 80;

    canvas.getObjects().forEach((obj: any) => {
      try {
        const isZone = Boolean(obj.isZone || obj.zoneId || obj.zoneGroup);
        if (!isZone) return;
        let shape: any = obj;
        if (obj.type === "group" && typeof obj.getObjects === "function") {
          shape = obj.getObjects().find((c: any) => c.type !== "text") ?? obj;
        }

        const zid = String(obj.zoneId ?? obj.id ?? "");
        const zoneName = (obj as any).zoneName ?? (obj as any).labelText ?? `Zone ${zid}`;
        const count = countMap.get(zid) ?? null;
        const hasNumericCount = count !== null && Number.isFinite(count);

        if (shape && !shape.__originalFill) shape.__originalFill = shape.fill ?? null;
        if (shape && !shape.__originalStroke) shape.__originalStroke = shape.stroke ?? null;

        if (shape) {
          shape.set("fill", "rgba(255, 255, 255, 0.05)");
          shape.set("stroke", "transparent");
          shape.set("strokeWidth", 0);
        }

        obj.set("selectable", false);
        obj.set("evented", true);
        obj.set("hoverCursor", "pointer");

        (obj as any).zoneData = {
          zoneId: zid,
          zoneName,
          count: hasNumericCount ? count : null,
          hasData: hasNumericCount,
        };

        const bounds = obj.getBoundingRect(true);
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;

        if (hasNumericCount) {
          const intensity = min === max ? 0.5 : (count! - min) / (max - min);
          const baseRadius = Math.max(layoutWidth, layoutHeight) * 0.4;
          const radius = baseRadius * (0.5 + intensity * 0.8);
          zoneHeatSpots.push({
            x: centerX - layoutLeft,
            y: centerY - layoutTop,
            count: count!,
            intensity,
            radius,
          });
        }

        if ((obj as any).zoneCountLabel) {
          try { canvas.remove((obj as any).zoneCountLabel); } catch { }
        }
        if ((obj as any).zoneLabelBg) {
          try { canvas.remove((obj as any).zoneLabelBg); } catch { }
        }

        const labelText = hasNumericCount ? String(count) : "—";
        const textHeight = LABEL_FONT_SIZE + LABEL_BG_PADDING * 2;
        const textWidth = LABEL_MIN_WIDTH;
        const labelBg = new fabric.Rect({
          left: centerX - textWidth / 2,
          top: centerY - textHeight / 2,
          width: textWidth,
          height: textHeight,
          rx: textHeight / 2,
          ry: textHeight / 2,
          fill: hasNumericCount ? "rgba(0, 0, 0, 0.8)" : "rgba(100, 100, 100, 0.6)",
          stroke: "transparent",
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        (labelBg as any).isZoneLabelBg = true;
        canvas.add(labelBg);
        (obj as any).zoneLabelBg = labelBg;

        const lbl = new fabric.Text(labelText, {
          left: centerX,
          top: centerY,
          originX: "center",
          originY: "center",
          fontSize: LABEL_FONT_SIZE,
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          fontWeight: "700",
          fill: "#ffffff",
          selectable: false,
          evented: false,
        });
        (lbl as any).isZoneCountLabel = true;
        canvas.add(lbl);
        (obj as any).zoneCountLabel = lbl;
      } catch { }
    });

    const heatmapCanvas = document.createElement("canvas");
    heatmapCanvas.width = layoutWidth;
    heatmapCanvas.height = layoutHeight;
    const ctx = heatmapCanvas.getContext("2d");
    if (!ctx) return;

    const sortedSpots = [...zoneHeatSpots].sort((a, b) => a.intensity - b.intensity);
    sortedSpots.forEach(({ x, y, intensity, radius }) => {
      const spotRadius = Math.max(radius * 0.25, 35);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, spotRadius);
      const numColors = palette.length;
      const colorPosition = intensity * (numColors - 1);
      const startColorIdx = Math.min(Math.floor(colorPosition), numColors - 1);
      let stopPosition = 0;
      const totalStops = startColorIdx + 1;
      for (let i = startColorIdx; i >= 0; i--) {
        const rgb = hexToRgb(palette[i]);
        const stopOffset = stopPosition / totalStops;
        const opacity = alpha * (0.95 - stopOffset * 0.4);
        gradient.addColorStop(Math.min(stopOffset, 0.99), `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
        stopPosition++;
      }
      const blueRgb = hexToRgb(palette[0]);
      gradient.addColorStop(1, `rgba(${blueRgb.r}, ${blueRgb.g}, ${blueRgb.b}, 0)`);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, spotRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    const dataURL = heatmapCanvas.toDataURL("image/png");
    fabric.Image.fromURL(dataURL).then((heatmapImage: fabric.Image) => {
      heatmapImage.set({
        left: layoutLeft,
        top: layoutTop,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      (heatmapImage as any).isHeatmapOverlay = true;
      canvas.add(heatmapImage);
      canvas.sendObjectToBack(heatmapImage);
      if (floorplan) canvas.sendObjectToBack(floorplan);
      canvas.getObjects().forEach((obj: any) => {
        if ((obj as any).isZoneLabelBg || (obj as any).isZoneCountLabel) {
          try { canvas.bringObjectToFront(obj); } catch { }
        }
      });
      canvas.requestRenderAll();
    }).catch((err) => console.error("Failed to create heatmap overlay:", err));
  };

  const setDottedGridBackground = () => {
    if (!editor) return;
    const gridSize = 20;
    const dotSize = 1.5;
    const gridCanvas = document.createElement("canvas");
    gridCanvas.width = gridSize;
    gridCanvas.height = gridSize;
    const ctx = gridCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#bbb";
      ctx.beginPath();
      ctx.arc(gridSize / 2, gridSize / 2, dotSize, 0, 2 * Math.PI);
      ctx.fill();
    }
    const pattern = new fabric.Pattern({ source: gridCanvas, repeat: "repeat" });
    editor.canvas.backgroundColor = pattern;
    editor.canvas.requestRenderAll();
  };

  const zoomIn = () => {
    if (!editor) return;
    const newZoom = zoom + 0.1;
    editor.canvas.setZoom(newZoom);
    setZoom(newZoom);
  };
  const zoomOut = () => {
    if (!editor) return;
    const newZoom = zoom - 0.1;
    if (newZoom <= 0.1) return;
    editor.canvas.setZoom(newZoom);
    setZoom(newZoom);
  };
  const resetZoom = () => {
    if (!editor) return;
    editor.canvas.setZoom(1);
    setZoom(1);
  };
  const centerCanvas = () => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    canvas.setZoom(1);
    setZoom(1);
    canvas.absolutePan(new fabric.Point(0, 0));
    canvas.requestRenderAll();
  };

  useEffect(() => {
    setDottedGridBackground();
  }, [editor]);

  useEffect(() => {
    const fetchLayout = async () => {
      const response = await getLayout();
      if (response.error) {
        console.warn("Failed to load layout:", response.error);
        return;
      }
      setLayout(response.data || null);
    };
    fetchLayout();
  }, []);

  useEffect(() => {
    if (!editor?.canvas || !layout) return;
    let layoutJson: any = null;
    try {
      if (Array.isArray(layout)) {
        const item = (layout as any).find((l: any) => l && (l.layout_json || l.layout)) || layout[0];
        layoutJson = item?.layout_json ?? item?.layout ?? item;
      } else if (typeof layout === "object") {
        layoutJson = (layout as any).layout_json ?? (layout as any).layout ?? layout;
      } else {
        layoutJson = layout;
      }
      if (typeof layoutJson === "string") layoutJson = JSON.parse(layoutJson);
    } catch (e) {
      console.error("Failed to parse layout JSON:", e);
      return;
    }
    if (!layoutJson) return;

    try {
      editor.canvas.clear();
      if (canvasRef.current) {
        editor.canvas.setWidth(canvasRef.current.clientWidth);
        editor.canvas.setHeight(canvasRef.current.clientHeight);
      }
      editor.canvas.loadFromJSON(layoutJson).then(async () => {
        try { setDottedGridBackground(); } catch { }
        const floor = editor.canvas.getObjects().find((o: any) => o.type === "image");
        if (floor) {
          (floor as any).isLayout = true;
          try {
            floor.selectable = false;
            floor.evented = false;
            editor.canvas.sendObjectToBack(floor);
          } catch { }
        }
        editor.canvas.requestRenderAll();
        try {
          setTimeout(() => {
            try { applyHeatmap(); } catch { }
          }, 50);
        } catch { }
      });
    } catch (e) {
      console.error("Failed to load layout into canvas:", e);
    }
  }, [editor, layout]);

  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const handleMouseOver = (opt: any) => {
      const target = opt.target;
      if (!target) return;
      const isZone = Boolean(target.isZone || target.zoneId || target.zoneGroup);
      if (!isZone) return;
      const zoneData = (target as any).zoneData;
      if (!zoneData) return;
      const canvasEl = canvas.getElement();
      const rect = canvasEl.getBoundingClientRect();
      const x = opt.e.clientX - rect.left + 15;
      const y = opt.e.clientY - rect.top - 10;
      setTooltip({
        visible: true,
        x,
        y,
        zoneName: zoneData.zoneName,
        count: zoneData.count,
        zoneId: zoneData.zoneId,
      });
    };
    const handleMouseOut = (opt: any) => {
      const target = opt.target;
      if (!target) return;
      const isZone = Boolean(target.isZone || target.zoneId || target.zoneGroup);
      if (!isZone) return;
      setTooltip((prev) => ({ ...prev, visible: false }));
    };
    const handleMouseMove = (opt: any) => {
      if (!tooltip.visible) return;
      const canvasEl = canvas.getElement();
      const rect = canvasEl.getBoundingClientRect();
      const x = opt.e.clientX - rect.left + 15;
      const y = opt.e.clientY - rect.top - 10;
      setTooltip((prev) => ({ ...prev, x, y }));
    };
    canvas.on("mouse:over", handleMouseOver);
    canvas.on("mouse:out", handleMouseOut);
    canvas.on("mouse:move", handleMouseMove);
    return () => {
      canvas.off("mouse:over", handleMouseOver);
      canvas.off("mouse:out", handleMouseOut);
      canvas.off("mouse:move", handleMouseMove);
    };
  }, [editor, tooltip.visible]);

  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const handleWheel = function (opt: any) {
      const delta = opt.e.deltaY;
      if (opt.e.ctrlKey) {
        let z = canvas.getZoom();
        z *= 0.999 ** delta;
        z = Math.min(Math.max(z, 0.2), 4);
        canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), z);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        setZoom(z);
      }
    };
    canvas.on("mouse:wheel", handleWheel);
    return () => canvas.off("mouse:wheel", handleWheel);
  }, [editor]);

  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const handleClick = (opt: any) => {
      try {
        const pointer = canvas.getPointer(opt.e);
        const p = new fabric.Point(pointer.x, pointer.y);
        let found: any = null;
        const objs = canvas.getObjects().slice().reverse();
        for (const obj of objs) {
          try {
            const isZone = Boolean((obj as any).isZone || (obj as any).zoneId);
            if (!isZone) continue;
            if (obj.type === "group" && typeof (obj as any).getObjects === "function") {
              const child = (obj as any).getObjects().find((c: any) => c.type !== "text");
              if (child && typeof (child as any).containsPoint === "function") {
                if ((child as any).containsPoint(p)) { found = obj; break; }
              } else {
                const b = (obj as any).getBoundingRect();
                if (pointer.x >= b.left && pointer.x <= b.left + b.width && pointer.y >= b.top && pointer.y <= b.top + b.height) {
                  found = obj; break;
                }
              }
            } else {
              if (typeof (obj as any).containsPoint === "function") {
                if ((obj as any).containsPoint(p)) { found = obj; break; }
              } else {
                const b = (obj as any).getBoundingRect();
                if (pointer.x >= b.left && pointer.x <= b.left + b.width && pointer.y >= b.top && pointer.y <= b.top + b.height) {
                  found = obj; break;
                }
              }
            }
          } catch { }
        }
        if (found) {
          const zid = (found as any).zoneId ?? (found as any).id ?? null;
          const zname = (found as any).zoneName ?? (found as any).labelText ?? null;
          setSelectedZone({ id: zid ? String(zid) : null, name: zname });
          try {
            const src = Array.isArray(heatMapData) ? heatMapData : (heatMapData as any)?.data ?? [];
            if (isProduct) {
              const zidNum = zid !== null && zid !== undefined ? Number(zid) : null;
              const productsForZone = (src as any[]).filter((item: any) => {
                const pz = item?.zone_id ?? item?.zoneId ?? item?.zone ?? null;
                if (pz === null || zidNum === null) return false;
                return Number(pz) === zidNum;
              });
              setSelectedZoneData(productsForZone.length > 0 ? productsForZone : null);
            } else {
              const match = (src as any[]).find((d: any) => String(d.zone_id) === String(zid));
              setSelectedZoneData(match ?? null);
            }
          } catch {
            setSelectedZoneData(null);
          }
          setIsDrawerOpen(true);
        } else {
          setSelectedZone({ id: null, name: null });
        }
      } catch { }
    };
    canvas.on("mouse:down", handleClick);
    return () => canvas.off("mouse:down", handleClick);
  }, [editor, heatMapData, isProduct]);

  const onchangeDateAndTiem = (date: Date[] | null) => {
    const isoDates = formatDateAndTime(date);
    setDateAndTime(isoDates);
  };

  const fetchHeatMap = async () => {
    try {
      setLoading(true);
      const response = isProduct
        ? await productInteraction({
          siteId: getSiteId(),
          startDate: dateAndTime[0],
          endDate: dateAndTime[1],
        })
        : await zoneCountHeatMap({
          siteId: getSiteId(),
          startDate: dateAndTime[0],
          endDate: dateAndTime[1],
        });
      if (response.error) {
        console.warn("Failed to load heatmap:", response.error);
        setHeatMapData([]);
        return;
      }
      const data = response?.data || [];
      setHeatMapData(data);
      try { applyHeatmap(data); } catch { }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLast24Data = async () => {
      try {
        setLoading(true);
        const response = isProduct
          ? await productInteraction({
            siteId: getSiteId(),
            startDate: dateAndTime[0],
            endDate: dateAndTime[1],
          })
          : await zoneCountHeatMap({
            siteId: getSiteId(),
            startDate: dateAndTime[0],
            endDate: dateAndTime[1],
          });
        if (response.error) {
          console.warn("Failed to load heatmap:", response.error);
          setHeatMapData([]);
          return;
        }
        const data = response?.data || [];
        setHeatMapData(data);
        try { applyHeatmap(data); } catch { }
      } finally {
        setLoading(false);
      }
    };
    fetchLast24Data();
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {loading && (
        <div className="w-full h-full absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-sm" style={{ color: colors.text }}>Loading...</div>
        </div>
      )}
      <div className="flex-none w-full grid place-content-end py-1">
        <DateTimePicker onchange={onchangeDateAndTiem} onsubmit={fetchHeatMap} />
      </div>
      <div
        ref={canvasRef}
        className="flex-1 min-h-0 border rounded-md relative w-full"
        style={{ borderColor: colors.border }}
      >
        <div className="absolute left-3 top-3 z-50 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-white whitespace-nowrap">Opacity</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => {
                const newOpacity = parseFloat(e.target.value);
                setHeatmapOpacity(newOpacity);
                applyHeatmap(undefined, { alpha: newOpacity });
              }}
              className="w-20 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs font-medium text-white w-8">
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </div>
        </div>
        <div className="absolute left-5 bottom-5 flex gap-1 z-50">
          <AppIconButton variant="default" onClick={centerCanvas} icon={SquareSquare} label="Re-Center" />
        </div>
        <div className="absolute right-5 bottom-5 flex gap-1 z-50">
          <AppTooltip label="Zoom In">
            <div className="bg-black w-8 h-8 grid items-center justify-center rounded-md">
              <Plus className="text-white" onClick={zoomIn} size={18} />
            </div>
          </AppTooltip>
          <AppTooltip label="Zoom Out">
            <div className="bg-black w-8 h-8 grid items-center justify-center rounded-md">
              <Minus className="text-white" onClick={zoomOut} size={18} />
            </div>
          </AppTooltip>
          <AppTooltip label="Reset Zoom">
            <div className="bg-black w-8 h-8 grid items-center justify-center rounded-md">
              <RotateCcw className="text-white" onClick={resetZoom} size={18} />
            </div>
          </AppTooltip>
        </div>
        {tooltip.visible && (
          <div className="absolute z-[100] pointer-events-none" style={{ left: tooltip.x, top: tooltip.y, transform: "translateY(-100%)" }}>
            <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl border border-gray-700 min-w-[140px]">
              <div className="text-xs text-gray-400 mb-1">Zone</div>
              <div className="font-semibold text-sm truncate max-w-[180px]">{tooltip.zoneName}</div>
              <div className="border-t border-gray-700 my-1.5"></div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{isProduct ? "Interactions" : "Visitors"}</span>
                <span className="font-bold text-lg">{tooltip.count !== null ? tooltip.count : "—"}</span>
              </div>
            </div>
          </div>
        )}
        <FabricJSCanvas
          className="sample-canvas border border-gray-300 rounded-md h-full w-full"
          onReady={onReady}
        />
        <HeatmapLegend
          min={heatmapRange.min}
          max={heatmapRange.max}
          gradientColors={HEATMAP_GRADIENT}
        />
      </div>
      <AppSheet
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={
          isProduct
            ? `Product Interaction for ${selectedZone.name ?? "Zone"}`
            : `Retail Analytics for ${selectedZone.name ?? "Zone"}`
        }
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: accent, color: colors.background }}
            >
              Close
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          {!selectedZoneData ? (
            <div>No detailed heatmap data available for this zone.</div>
          ) : isProduct && Array.isArray(selectedZoneData) ? (
            <div className="space-y-2">
              {selectedZoneData.map((p: any, idx: number) => {
                const demographics = p.demographics ?? p.demo ?? {};
                const ageObj = demographics?.["AGE Category"] ?? demographics?.ageCategory ?? {};
                const genderObj = demographics?.["Gender"] ?? demographics?.gender ?? {};
                const renderBreakdown = (obj: any) => {
                  try {
                    const keys = Object.keys(obj || {});
                    if (!keys || keys.length === 0)
                      return (
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          -
                        </span>
                      );
                    return (
                      <div className="flex gap-2 flex-wrap text-xs" style={{ color: colors.textMuted }}>
                        {keys.map((k) => (
                          <div
                            key={k}
                            className="px-2 py-0.5 rounded"
                            style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
                          >
                            <span className="font-medium" style={{ color: colors.text }}>
                              {k}:
                            </span>{" "}
                            {obj[k]}
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    return (
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        -
                      </span>
                    );
                  }
                };
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl shadow-sm relative"
                    style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-[1.1rem]">Product Name</Label>
                        <div style={{ color: colors.textMuted }}>{p.product_name ?? p.productName ?? "-"}</div>
                        <Label className="font-semibold text-[1.1rem]">Product ID</Label>
                        <div style={{ color: colors.textMuted }}>{p.product_id ?? p.productId ?? "-"}</div>
                        <Label className="font-semibold text-[1.1rem]">Product Nick Name</Label>
                        <div style={{ color: colors.textMuted }}>{p.alias ?? p.nickName ?? "-"}</div>
                      </div>
                      <div>
                        <Label className="font-semibold text-[1.1rem]"></Label>
                        <div style={{ color: colors.textMuted }}>
                          {p.zone_name ?? p.zoneName ?? selectedZone.name ?? "-"}
                        </div>
                        <Label className="font-semibold text-[1.1rem]">Interaction Count</Label>
                        <div className="font-bold text-lg" style={{ color: accent }}>
                          {p.interaction_count ?? "-"}
                        </div>
                        <Label className="font-semibold text-[1.1rem]">Location Info</Label>
                        <div style={{ color: colors.textMuted }}>{p.location ?? p.zone_name ?? "-"}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-[1.1rem]">AGE Category</Label>
                        <div className="pt-2">{renderBreakdown(ageObj)}</div>
                      </div>
                      <div>
                        <Label className="font-semibold text-[1.1rem]">Gender</Label>
                        <div className="pt-2">{renderBreakdown(genderObj)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <Card className="p-3 rounded-2xl" style={{ borderColor: colors.border, backgroundColor: colors.backgroundCard }}>
                <div className="text-lg font-semibold">
                  {(selectedZoneData as any).zone_name ?? selectedZone.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Zone ID: {(selectedZoneData as any).zone_id ?? selectedZone.id}
                </div>
              </Card>
              <Card className="p-3 rounded-2xl" style={{ borderColor: colors.border, backgroundColor: colors.backgroundCard }}>
                <div className="font-medium mb-2">Visitor Count</div>
                <div className="text-2xl font-bold" style={{ color: accent }}>
                  {String((selectedZoneData as any).visitor_count ?? "N/A")}
                </div>
              </Card>
              <Card className="p-3 rounded-2xl" style={{ borderColor: colors.border, backgroundColor: colors.backgroundCard }}>
                <div className="font-semibold mb-2">Demographics</div>
                {(selectedZoneData as any).demographics &&
                  typeof (selectedZoneData as any).demographics === "object" ? (
                  Object.entries((selectedZoneData as any).demographics).map(([key, val]) => (
                    <div key={key} className="mb-2">
                      <div className="font-semibold">{String(key).trim()}</div>
                      {val && typeof val === "object" ? (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {Object.entries(val as any).map(([k2, v2]) => (
                            <div key={k2} className="grid grid-cols-2">
                              <div>{k2}</div>
                              <div className="font-semibold">{String(v2)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>—</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div>No demographics available</div>
                )}
              </Card>
            </div>
          )}
        </div>
      </AppSheet>
    </div>
  );
}

export default function RetailAnalyticsTab({ accent }: { accent: string }) {
  const [analyticsType, setAnalyticsType] = useState<"zone" | "product">("zone");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none flex items-center justify-between flex-wrap gap-4 pb-1">
        <div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>
            {analyticsType === "zone" ? "Retail Analytics" : "Product Interaction"}
          </h2>
        </div>
        <div className="flex items-center gap-2 p-1 rounded-xl" style={{ backgroundColor: colors.backgroundCard }}>
          <button
            onClick={() => setAnalyticsType("zone")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: analyticsType === "zone" ? accent : "transparent",
              color: analyticsType === "zone" ? colors.background : colors.textMuted,
            }}
          >
            Retail Analytics
          </button>
          <button
            onClick={() => setAnalyticsType("product")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: analyticsType === "product" ? accent : "transparent",
              color: analyticsType === "product" ? colors.background : colors.textMuted,
            }}
          >
            Product Interaction
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <HeatmapView mode={analyticsType} accent={accent} />
      </div>
    </div>
  );
}
