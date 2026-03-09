"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FabricJSCanvas, useFabricJSEditor } from "fabricjs-react";
import * as fabric from "fabric";
import { Minus, Plus, RotateCcw, SquareSquare } from "lucide-react";
import { colors } from "@/config/theme";
import AppTooltip from "@/app/component/app-tooltip/AppTooltip";
import AppIconButton from "@/app/component/app-icon-button/AppIconButton";
import AppSheet from "@/app/component/app-sheet/AppSheet";
import DateTimePicker from "@/app/component/date-time-picker/DateTimePicker";
import { zoneCountHeatMap, productInteraction } from "@/app/services/heatmap/heatmap";
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
  onViewStream,
}: {
  mode: "zone" | "product";
  accent: string;
  onViewStream?: (cameraName: string) => void;
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
  const heatMapDataRef = useRef<any[]>([]);
  const layoutLoadedRef = useRef(false);
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

  const isZoneObject = (obj: any): boolean => {
    return Boolean(
      obj.isZone || obj.zoneId || obj.zone_id ||
      obj.zoneGroup || obj.zone_group ||
      obj.zoneName || obj.zone_name
    );
  };

  const getZoneId = (obj: any): string => {
    return String(obj.zoneId ?? obj.zone_id ?? obj.id ?? "");
  };

  const getZoneName = (obj: any): string => {
    return obj.zoneName ?? obj.zone_name ?? obj.labelText ?? obj.name ?? `Zone ${getZoneId(obj)}`;
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

  const applyHeatmap = useCallback((data?: any[], opts?: { colors?: string[]; alpha?: number }) => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const palette = opts?.colors ?? HEATMAP_GRADIENT;
    const alpha = typeof opts?.alpha === "number" ? opts.alpha : 0.7;
    const sourceData = normalizeSource(data ?? heatMapDataRef.current);
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

    const countMap = new Map<string, number>();
    sourceData.forEach((h: any) => {
      const zid = h?.zone_id ?? h?.zoneId ?? h?.id;
      const c = getCountValue(h);
      if (zid !== undefined && c !== null) {
        const key = String(zid);
        countMap.set(key, (countMap.get(key) ?? 0) + c);
      }
    });

    const numericCounts = Array.from(countMap.values());
    const max = numericCounts.length > 0 ? Math.max(...numericCounts) : 0;
    const min = 0;
    setHeatmapRange({ min, max });

    const zoneHeatSpots: { x: number; y: number; count: number; intensity: number; radius: number }[] = [];
    const LABEL_FONT_SIZE = 13;
    const LABEL_BG_PADDING = 5;
    const LABEL_MIN_WIDTH = 40;

    canvas.getObjects().forEach((obj: any) => {
      try {
        if (!isZoneObject(obj)) return;
        let shape: any = obj;
        if (obj.type === "group" && typeof obj.getObjects === "function") {
          shape = obj.getObjects().find((c: any) => c.type !== "text") ?? obj;
        }

        const zid = getZoneId(obj);
        const zoneName = getZoneName(obj);
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
  }, [editor]);

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

  const fitCanvasToContent = (padding = 40) => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const objs = canvas.getObjects();
    if (!objs || objs.length === 0) return centerCanvas();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objs.forEach((o: any) => {
      try {
        const b = o.getBoundingRect(true);
        minX = Math.min(minX, b.left);
        minY = Math.min(minY, b.top);
        maxX = Math.max(maxX, b.left + b.width);
        maxY = Math.max(maxY, b.top + b.height);
      } catch {
        minX = Math.min(minX, o.left || 0);
        minY = Math.min(minY, o.top || 0);
        maxX = Math.max(maxX, (o.left || 0) + (o.width || 0));
        maxY = Math.max(maxY, (o.top || 0) + (o.height || 0));
      }
    });

    if (!isFinite(minX) || !isFinite(maxX)) return centerCanvas();

    const boundsW = maxX - minX;
    const boundsH = maxY - minY;
    const cW = canvas.getWidth() || 1;
    const cH = canvas.getHeight() || 1;
    const newZoom = Math.min((cW - padding) / boundsW, (cH - padding) / boundsH, 1);
    const cx = minX + boundsW / 2;
    const cy = minY + boundsH / 2;
    const offsetX = cW / 2 - cx * newZoom;
    const offsetY = cH / 2 - cy * newZoom;

    canvas.setZoom(newZoom);
    try {
      canvas.setViewportTransform([newZoom, 0, 0, newZoom, offsetX, offsetY]);
    } catch {
      canvas.absolutePan(new fabric.Point(-offsetX, -offsetY));
    }
    setZoom(newZoom);
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
        layoutLoadedRef.current = true;
        setTimeout(() => {
          try { applyHeatmap(heatMapDataRef.current); } catch { }
          try { fitCanvasToContent(); } catch { }
        }, 50);
      });
    } catch (e) {
      console.error("Failed to load layout into canvas:", e);
    }
  }, [editor, layout, applyHeatmap]);

  // Re-apply heatmap whenever data changes and layout is already loaded
  useEffect(() => {
    heatMapDataRef.current = heatMapData;
    if (layoutLoadedRef.current && heatMapData.length > 0) {
      try { applyHeatmap(heatMapData); } catch { }
    }
  }, [heatMapData, applyHeatmap]);

  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const handleMouseOver = (opt: any) => {
      const target = opt.target;
      if (!target) return;
      if (!isZoneObject(target)) return;
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
      if (!isZoneObject(target)) return;
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
            if (!isZoneObject(obj)) continue;
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
          const zid = getZoneId(found) || null;
          const zname = getZoneName(found) || null;
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
      heatMapDataRef.current = data;
      setHeatMapData(data);
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
        heatMapDataRef.current = data;
        setHeatMapData(data);
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
            <div className="px-3 py-2 rounded-lg shadow-xl min-w-[140px]" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
              <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Zone</div>
              <div className="font-semibold text-sm truncate max-w-[180px]" style={{ color: colors.primary }}>{tooltip.zoneName}</div>
              <div className="my-1.5" style={{ borderTop: `1px solid ${colors.border}` }}></div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: colors.textMuted }}>{isProduct ? "Interactions" : "Visitors"}</span>
                <span className="font-bold text-lg" style={{ color: colors.primary }}>{tooltip.count !== null ? tooltip.count : "—"}</span>
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
            ? `Product Interaction for ${selectedZone.name ?? "Zone"} zone.`
            : `Retail Analytics for ${selectedZone.name ?? "Zone"}`
        }
        footer={(() => {
          const ZONE_CAMERA_MAP: Record<string, string> = {
            "daily essentials": "Shopping_Area_CAM7",
            "sanitation": "Shopping_Area_CAM7",
            "packaged food": "Shopping_Area_CAM53",
          };
          const zoneCam = isProduct && onViewStream && selectedZone.name
            ? ZONE_CAMERA_MAP[selectedZone.name.toLowerCase()] ?? null
            : null;
          return (
            <div className="flex gap-2">
              {zoneCam && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onViewStream!(zoneCam);
                  }}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5"
                  style={{ backgroundColor: accent, color: colors.background }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  View Stream
                </button>
              )}
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: zoneCam ? `${accent}15` : accent,
                  color: zoneCam ? accent : colors.background,
                  border: `1px solid ${accent}`,
                }}
              >
                Close
              </button>
            </div>
          );
        })()}
      >
        <div className="p-4 space-y-4">
          {!selectedZoneData ? (
            <div>No detailed heatmap data available for this zone.</div>
          ) : isProduct && Array.isArray(selectedZoneData) ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {selectedZoneData.map((p: any, idx: number) => {
                // Safely extract demographics. Sometimes it's nested or stringified depending on API changes
                let demographics: any = {};
                if (p.demographics && typeof p.demographics === "object") demographics = p.demographics;
                else if (p.demo && typeof p.demo === "object") demographics = p.demo;
                else if (typeof p.demographics === "string") {
                  try { demographics = JSON.parse(p.demographics); } catch { }
                }

                // The API can return exact strings like "AGE Category" or "Gender" at the root level of demographics.
                // Or sometimes it's nested under demo. We need to be careful with casing.
                let ageObj = demographics?.["AGE Category"] ?? demographics?.ageCategory ?? demographics?.age ?? demographics?.["Age Category"] ?? {};
                let genderObj = demographics?.["Gender"] ?? demographics?.gender ?? {};

                // If it's totally empty but the root object has them (flattened API response)
                if (Object.keys(ageObj).length === 0 && (p["AGE Category"] || p.ageCategory)) {
                  ageObj = p["AGE Category"] ?? p.ageCategory;
                }
                if (Object.keys(genderObj).length === 0 && (p["Gender"] || p.gender)) {
                  genderObj = p["Gender"] ?? p.gender;
                }

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
                    className="flex flex-col p-4 rounded-xl shadow-sm relative transition-colors h-full"
                    style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}
                  >
                    <div className="grid grid-cols-5 gap-4 h-full">
                      {/* Left Side: Details */}
                      <div className="col-span-3 flex flex-col space-y-3 pr-4 border-r" style={{ borderColor: `${colors.border}80` }}>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Product</div>
                          <div className="font-bold text-sm leading-tight mt-0.5">{p.product_name ?? p.productName ?? "Unknown"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>ID</div>
                          <div className="text-sm font-medium mt-0.5">{p.product_id ?? p.productId ?? "-"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Zone Name</div>
                          <div className="text-sm mt-0.5 line-clamp-2" title={p.location ?? p.zone_name ?? selectedZone.name ?? "-"}>
                            {p.location ?? p.zone_name ?? selectedZone.name ?? "-"}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Primary Metric */}
                      <div className="col-span-2 flex flex-col justify-center items-center rounded-lg p-2" style={{ backgroundColor: `${accent}15` }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: accent }}>Interactions</div>
                        <div className="text-3xl font-black mt-1" style={{ color: accent }}>{p.interaction_count ?? "-"}</div>
                      </div>
                    </div>

                    {/* Bottom Split: Demographics (Span Full Width - ALWAYS VISIBLE) */}
                    <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: colors.border }}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] uppercase font-bold mb-1 tracking-wider" style={{ color: colors.textMuted }}>Age Category</div>
                          {renderBreakdown(ageObj)}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold mb-1 tracking-wider" style={{ color: colors.textMuted }}>Gender</div>
                          {renderBreakdown(genderObj)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {(() => {
                const zData = selectedZoneData as any;
                const demographics = zData.demographics ?? zData.demo ?? {};

                let ageObj = demographics?.["AGE Category"] ?? demographics?.ageCategory ?? demographics?.age ?? demographics?.["Age Category"] ?? {};
                let genderObj = demographics?.["Gender"] ?? demographics?.gender ?? {};

                if (Object.keys(ageObj).length === 0 && (zData["AGE Category"] || zData.ageCategory)) {
                  ageObj = zData["AGE Category"] ?? zData.ageCategory;
                }
                if (Object.keys(genderObj).length === 0 && (zData["Gender"] || zData.gender)) {
                  genderObj = zData["Gender"] ?? zData.gender;
                }

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
                  <div className="flex flex-col p-4 rounded-xl shadow-sm relative transition-colors h-full" style={{ backgroundColor: colors.backgroundCard, border: `1px solid ${colors.border}` }}>
                    <div className="grid grid-cols-5 gap-4 h-full">
                      {/* Left Side: Details */}
                      <div className="col-span-3 flex flex-col space-y-3 pr-4 border-r" style={{ borderColor: `${colors.border}80` }}>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Zone Name</div>
                          <div className="font-bold text-sm leading-tight mt-0.5">{zData.zone_name ?? selectedZone.name ?? "Unknown Zone"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Zone ID</div>
                          <div className="text-sm font-medium mt-0.5">{zData.zone_id ?? selectedZone.id ?? "-"}</div>
                        </div>
                      </div>

                      {/* Right Side: Primary Metric */}
                      <div className="col-span-2 flex flex-col justify-center items-center rounded-lg p-2" style={{ backgroundColor: `${accent}15` }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: accent }}>Visitors</div>
                        <div className="text-3xl font-black mt-1" style={{ color: accent }}>{zData.visitor_count ?? "-"}</div>
                      </div>
                    </div>

                    {/* Bottom Split: Demographics (Span Full Width - ALWAYS VISIBLE) */}
                    <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: colors.border }}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] uppercase font-bold mb-1 tracking-wider" style={{ color: colors.textMuted }}>Age Category</div>
                          {renderBreakdown(ageObj)}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold mb-1 tracking-wider" style={{ color: colors.textMuted }}>Gender</div>
                          {renderBreakdown(genderObj)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </AppSheet>
    </div>
  );
}

export { HeatmapView as RetailHeatmapView };

export default HeatmapView;
