"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { FabricJSCanvas, useFabricJSEditor } from "fabricjs-react";
import { Minus, Plus, RotateCcw, SquareSquare, MapPin, Play, Square } from "lucide-react";
import { colors } from "@/config/theme";
import { getSiteId } from "@/config/site";
import { getAllAssetData, Asset } from "@/app/services/assets/asset";
import AppSelect from "@/app/component/app-select/AppSelect";
import AppButton from "@/app/component/app-button/AppButton";
import AppIconButton from "@/app/component/app-icon-button/AppIconButton";
import AppTooltip from "@/app/component/app-tooltip/AppTooltip";
import AppLoading from "@/app/component/app-loading/AppLoading";

interface WarehouseIndoorPositioningTabProps {
  accentColor?: string;
}

function WarehouseIndoorPositioningTab({
  accentColor = colors.warehouseAccent,
}: WarehouseIndoorPositioningTabProps) {
  const [loading, setLoading] = useState(false);
  const { editor, onReady } = useFabricJSEditor();
  // Floor plan image from public/assets/Logos
  const image = "/assets/Logos/new_office_warehouse.png";
  const canvasRef = useRef<HTMLDivElement>(null);
  const [allAsset, setAllAsset] = useState<Asset[]>([]);
  const [imageError, setImageError] = useState(false);

  // Physical floor dimensions in centimeters
  const PHYS_FLOOR_WIDTH_CM = 523;
  const PHYS_FLOOR_HEIGHT_CM = 427;

  const [zoom, setZoom] = useState(1);
  const [liveTracking, setLiveTracking] = useState(false);
  const [selectAsset, setSelectedAsset] = useState<string>();
  const [debugInfo, setDebugInfo] = useState<string>("");

  // refs for SSE and marker
  const liveSourceRef = useRef<EventSource | null>(null);
  const liveMarkersRef = useRef<Record<string, fabric.Object>>({});

  // SSE reconnect backoff state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const SSE_URL_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/v1/asset/live-tracking`
    : "https://tgx-app-api.dev.intellobots.com/v1/asset/live-tracking";

  const onSelectAsset = (asset: string | undefined) => {
    if (asset) {
      setSelectedAsset(asset);
    }
  };

  const parseSSEData = (data: unknown) => {
    try {
      if (!data) return null;
      if (typeof data === "object") return data;
      return JSON.parse(data as string);
    } catch {
      return data;
    }
  };

  const setDottedGridBackground = useCallback(() => {
    if (!editor) return;

    const gridSize = 20;
    const dotSize = 1.5;
    const gridCanvas = document.createElement("canvas");
    gridCanvas.width = gridSize;
    gridCanvas.height = gridSize;

    const ctx = gridCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(gridSize / 2, gridSize / 2, dotSize, 0, 2 * Math.PI);
      ctx.fill();
    }

    const pattern = new fabric.Pattern({
      source: gridCanvas,
      repeat: "repeat",
    });

    editor.canvas.backgroundColor = pattern;
    editor.canvas.requestRenderAll();
  }, [editor]);

  // Update live marker position on the canvas
  const updateLiveMarker = useCallback(
    (raw: unknown) => {
      if (!editor?.canvas) return;
      const canvas = editor.canvas;

      try {
        const items = Array.isArray(raw) ? raw : [raw];
        const floor = canvas.getObjects().find((o: fabric.Object & { isLayout?: boolean }) => o.isLayout);
        if (!floor) {
          console.error("No floor image found");
          return;
        }

        const scale = (floor.scaleX || 1) as number;
        const left = (floor.left ?? 0) as number;
        const top = (floor.top ?? 0) as number;
        const origW = (floor as fabric.Object & { __originalWidth?: number }).
          __originalWidth || floor.width || 0;
        const origH = (floor as fabric.Object & { __originalHeight?: number }).
          __originalHeight || floor.height || 0;
        const displayW = origW * scale;
        const displayH = origH * scale;

        items.forEach((rawItem: Record<string, unknown>) => {
          const d = (rawItem?.data ?? rawItem ?? {}) as Record<string, unknown>;
          const assetIdVal = String(
            rawItem.asset_id ??
              rawItem.assetId ??
              d.asset_id ??
              d.assetId ??
              d.id ??
              Math.random()
          );

          // Get raw coordinates
          const rawX =
            parseFloat(String(d.x ?? d.img_x ?? d.x_px ?? d.imgPx ?? d.longitude ?? 0)) || 0;
          const rawY =
            parseFloat(String(d.y ?? d.img_y ?? d.y_px ?? d.imgPy ?? d.latitude ?? 0)) || 0;

          // ORIGIN AT TOP-LEFT:
          // x: 0 to 523 maps to left to left + displayW
          // y: 0 to -427 maps to top to top + displayH

          const dispX = left + (rawX / PHYS_FLOOR_WIDTH_CM) * displayW;
          const positiveY = -rawY;
          const dispY = top + (positiveY / PHYS_FLOOR_HEIGHT_CM) * displayH;

          const debug = `Asset: ${assetIdVal} | Raw: (${rawX.toFixed(2)}, ${rawY.toFixed(2)}) → Display: (${dispX.toFixed(1)}, ${dispY.toFixed(1)})`;
          setDebugInfo(debug);

          // Clamp to image bounds
          const clampedX = Math.max(left, Math.min(left + displayW, dispX));
          const clampedY = Math.max(top, Math.min(top + displayH, dispY));

          const existing = liveMarkersRef.current[assetIdVal];
          if (!existing) {
            // Create new marker
            const marker = new fabric.Circle({
              left: clampedX,
              top: clampedY,
              radius: 10,
              fill: accentColor,
              stroke: "#fff",
              strokeWidth: 3,
              originX: "center",
              originY: "center",
              selectable: false,
              evented: false,
              shadow: new fabric.Shadow({
                color: "rgba(0,0,0,0.5)",
                blur: 10,
                offsetX: 0,
                offsetY: 2,
              }),
            });
            (marker as fabric.Object & { assetId?: string }).assetId = assetIdVal;
            canvas.add(marker);
            liveMarkersRef.current[assetIdVal] = marker;

            // Add label
            const assetName = String(d.asset_name || rawItem.asset_name || assetIdVal);
            const label = new fabric.Text(assetName, {
              left: clampedX + 18,
              top: clampedY - 8,
              fontSize: 12,
              fill: "#fff",
              backgroundColor: "rgba(0,0,0,0.7)",
              selectable: false,
              evented: false,
            });
            (label as fabric.Object & { isCoordLabel?: boolean; linkedAssetId?: string }).isCoordLabel = true;
            (label as fabric.Object & { linkedAssetId?: string }).linkedAssetId = assetIdVal;
            canvas.add(label);

            return;
          }

          // Update existing marker
          try {
            existing.set({ left: clampedX, top: clampedY });

            // Update linked label
            const labels = canvas.getObjects().filter(
              (obj: fabric.Object & { isCoordLabel?: boolean; linkedAssetId?: string }) =>
                obj.isCoordLabel && obj.linkedAssetId === assetIdVal
            );
            labels.forEach((label) => {
              label.set({ left: clampedX + 18, top: clampedY - 8 });
            });

            canvas.requestRenderAll();
          } catch (err) {
            console.error("Error updating marker:", err);
          }
        });

        canvas.requestRenderAll();
      } catch (e) {
        console.error("updateLiveMarker error", e);
      }
    },
    [editor, accentColor, PHYS_FLOOR_WIDTH_CM, PHYS_FLOOR_HEIGHT_CM]
  );

  const startLiveTracking = useCallback(() => {
    if (!editor?.canvas) {
      console.error("Editor or canvas not available");
      return;
    }
    setLiveTracking(true);

    if (liveSourceRef.current) {
      try {
        liveSourceRef.current.close();
      } catch {
        // ignore
      }
      liveSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    if (!selectAsset) {
      alert("Please select an asset first");
      setLiveTracking(false);
      return;
    }

    const openEventSource = () => {
      const url = `${SSE_URL_BASE}?asset_id=${encodeURIComponent(selectAsset)}`;
      const token =
        typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const controller = new AbortController();
      const signal = controller.signal;

      const start = async () => {
        try {
          const resp = await fetch(url, {
            method: "GET",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              Accept: "text/event-stream",
            },
            credentials: "include",
            signal,
          });

          if (!resp.ok) {
            throw new Error(`SSE fetch failed: ${resp.status}`);
          }

          console.log("SSE connection opened", url);
          reconnectAttemptsRef.current = 0;

          const reader = resp.body?.getReader();
          if (!reader) throw new Error("No readable stream for SSE");
          const decoder = new TextDecoder("utf-8");
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const chunk = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              const lines = chunk.split(/\r?\n/);
              let data = "";
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  data += line.slice(5).trim() + "\n";
                }
              }
              if (data) {
                const payloadText = data.trim();
                const parsed = parseSSEData(payloadText) as Record<string, unknown> | null;
                const payload = parsed?.data ?? parsed;
                updateLiveMarker(payload);
              }
            }
          }
        } catch (err: unknown) {
          if (signal.aborted) return;
          console.warn("SSE error", err);
          liveSourceRef.current = null;
          setLiveTracking(false);

          const attempt = reconnectAttemptsRef.current ?? 0;
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          reconnectAttemptsRef.current = attempt + 1;
          console.warn(`SSE will retry in ${delay}ms (attempt ${attempt + 1})`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            openEventSource();
            setLiveTracking(true);
          }, delay);
        }
      };

      start();

      liveSourceRef.current = {
        close: () => controller.abort(),
      } as EventSource;
    };

    openEventSource();
  }, [editor, selectAsset, SSE_URL_BASE, updateLiveMarker]);

  const stopLiveTracking = useCallback(() => {
    setLiveTracking(false);

    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (liveSourceRef.current) {
      try {
        liveSourceRef.current.close();
      } catch {
        // ignore
      }
      liveSourceRef.current = null;
    }

    try {
      if (!editor?.canvas) return;
      const canvas = editor.canvas;
      Object.keys(liveMarkersRef.current || {}).forEach((k) => {
        try {
          const obj = liveMarkersRef.current[k];
          if (obj) canvas.remove(obj);
        } catch {
          // ignore
        }
      });
      liveMarkersRef.current = {};

      const labels = canvas.getObjects().filter(
        (obj: fabric.Object & { isCoordLabel?: boolean }) => obj.isCoordLabel
      );
      labels.forEach((obj) => canvas.remove(obj));

      canvas.requestRenderAll();
    } catch {
      // ignore
    }
  }, [editor]);

  const zoomIn = () => {
    if (!editor) return;
    const newZoom = +(zoom + 0.1).toFixed(2);
    editor.canvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const zoomOut = () => {
    if (!editor) return;
    const newZoom = +(zoom - 0.1).toFixed(2);
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

  // Mouse wheel zoom/pan
  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;

    const wheelHandler = function (opt: fabric.TEvent) {
      const e = opt?.e as WheelEvent;
      if (!e) return;
      const delta = e.deltaY;

      if (e.ctrlKey) {
        let z = canvas.getZoom();
        z *= Math.pow(0.999, delta);
        z = Math.min(Math.max(z, 0.2), 4);
        canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), z);
        e.preventDefault();
        e.stopPropagation();
        setZoom(z);
        return;
      } else if (e.shiftKey) {
        const vpt = canvas.viewportTransform!;
        vpt[4] += -delta;
        canvas.requestRenderAll();
        e.preventDefault();
        e.stopPropagation();
        return;
      } else {
        const vpt = canvas.viewportTransform!;
        vpt[5] += -delta;
        canvas.requestRenderAll();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    canvas.on("mouse:wheel", wheelHandler as (opt: fabric.TEvent) => void);
    return () => {
      canvas.off("mouse:wheel", wheelHandler as (opt: fabric.TEvent) => void);
    };
  }, [editor]);

  // Space + drag panning
  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;
    const canvasElement = canvas.getElement();

    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let spacePressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spacePressed) {
        spacePressed = true;
        canvas.setCursor("grab");
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressed = false;
        if (!isPanning) canvas.setCursor("default");
      }
    };

    const handleCanvasMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        isPanning = true;
        lastPosX = e.clientX;
        lastPosY = e.clientY;
        canvas.setCursor("grabbing");
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const handleCanvasMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isPanning = false;
        canvas.setCursor("default");
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleFabricMouseDown = (opt: fabric.TEvent) => {
      const evt = opt.e as MouseEvent;
      if (spacePressed) {
        isPanning = true;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.setCursor("grabbing");
        evt.preventDefault();
      }
    };
    const handleMouseMove = (opt: fabric.TEvent) => {
      if (!isPanning) return;
      const evt = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform!;
      vpt[4] += evt.clientX - lastPosX;
      vpt[5] += evt.clientY - lastPosY;
      canvas.requestRenderAll();
      lastPosX = evt.clientX;
      lastPosY = evt.clientY;
    };
    const handleFabricMouseUp = () => {
      if (spacePressed) {
        isPanning = false;
        canvas.setCursor("grab");
      }
    };

    canvasElement.addEventListener("mousedown", handleCanvasMouseDown);
    canvasElement.addEventListener("mouseup", handleCanvasMouseUp);

    canvas.on("mouse:down", handleFabricMouseDown as (opt: fabric.TEvent) => void);
    canvas.on("mouse:move", handleMouseMove as (opt: fabric.TEvent) => void);
    canvas.on("mouse:up", handleFabricMouseUp as () => void);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      canvasElement.removeEventListener("mousedown", handleCanvasMouseDown);
      canvasElement.removeEventListener("mouseup", handleCanvasMouseUp);
      canvas.off("mouse:down", handleFabricMouseDown as (opt: fabric.TEvent) => void);
      canvas.off("mouse:move", handleMouseMove as (opt: fabric.TEvent) => void);
      canvas.off("mouse:up", handleFabricMouseUp as () => void);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [editor]);

  // Load floor image
  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;

    try {
      const existing = canvas.getObjects().find(
        (o: fabric.Object & { isLayout?: boolean }) => o.isLayout
      );
      if (existing) {
        canvas.remove(existing);
      }
    } catch {
      // ignore
    }

    try {
      const loader = new window.Image();
      loader.src = image;
      loader.onload = () => {
        const origW = loader.naturalWidth || loader.width || 0;
        const origH = loader.naturalHeight || loader.height || 0;

        fabric.Image.fromURL(image)
          .then((fimg: fabric.Image) => {
            try {
              const cW = canvas.getWidth() || 1;
              const cH = canvas.getHeight() || 1;
              const scale = Math.min(cW / origW, cH / origH, 1) * 0.9;
              const displayW = origW * scale;
              const displayH = origH * scale;
              const left = Math.max(0, (cW - displayW) / 2);
              const top = Math.max(0, (cH - displayH) / 2);

              fimg.set({
                left,
                top,
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false,
                originX: "left",
                originY: "top",
              });
              fimg.scaleX = scale;
              fimg.scaleY = scale;
              (fimg as fabric.Image & { __originalWidth?: number }).__originalWidth = origW;
              (fimg as fabric.Image & { __originalHeight?: number }).__originalHeight = origH;
              (fimg as fabric.Image & { isLayout?: boolean }).isLayout = true;

              canvas.add(fimg);
              try {
                canvas.sendObjectToBack(fimg);
              } catch {
                // ignore
              }

              // Add border
              const border = new fabric.Rect({
                left: left,
                top: top,
                width: displayW,
                height: displayH,
                stroke: accentColor,
                strokeWidth: 2,
                fill: "transparent",
                selectable: false,
                evented: false,
              });
              canvas.add(border);

              try {
                setDottedGridBackground();
              } catch {
                // ignore
              }

              canvas.requestRenderAll();
            } catch (e) {
              console.error("Error setting up image:", e);
            }
          })
          .catch((err) => {
            console.error("Error loading image:", err);
          });
      };
      loader.onerror = () => {
        console.error("Failed to load floor plan image. Please add the image at /public/assets/Logos/new_office_warehouse.png");
        setImageError(true);
      };
    } catch (e) {
      console.error("Error in image loading setup:", e);
    }
  }, [editor, image, accentColor, setDottedGridBackground]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (liveSourceRef.current) {
        try {
          liveSourceRef.current.close();
        } catch {
          // ignore
        }
        liveSourceRef.current = null;
      }

      if (editor?.canvas) {
        try {
          Object.keys(liveMarkersRef.current || {}).forEach((k) => {
            try {
              const obj = liveMarkersRef.current[k];
              if (obj) editor.canvas.remove(obj);
            } catch {
              // ignore
            }
          });
        } catch {
          // ignore
        }
        liveMarkersRef.current = {};
      }
    };
  }, [editor]);

  // Fetch assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const siteId = getSiteId();
        const response = await getAllAssetData(siteId);
        const activeAsset = response?.filter((asset) => asset?.active_tracking);
        setAllAsset(activeAsset);
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  return (
    <div className="relative w-full">
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50 rounded-xl"
          style={{ backgroundColor: `${colors.background}e6` }}
        >
          <AppLoading message="Loading assets..." />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <AppSelect
            label="Select Asset"
            onchange={onSelectAsset}
            value={selectAsset}
            options={allAsset?.map((item) => ({
              label: item?.asset_name,
              value: String(item?.asset_id),
            })) || []}
            placeholder="Choose an asset to track"
          />
        </div>
        <div className="flex gap-2">
          <AppButton
            onClick={() => {
              if (liveTracking) stopLiveTracking();
              else startLiveTracking();
            }}
            variant={liveTracking ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {liveTracking ? <Square size={16} /> : <Play size={16} />}
            {liveTracking ? "Stop Tracking" : "Start Live Tracking"}
          </AppButton>
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div
          className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
          style={{
            backgroundColor: `${accentColor}15`,
            border: `1px solid ${accentColor}40`,
            color: colors.text,
          }}
        >
          <MapPin size={16} style={{ color: accentColor }} />
          <span>{debugInfo}</span>
        </div>
      )}

      {/* Image Error Message */}
      {imageError && (
        <div
          className="mb-4 p-4 rounded-lg text-sm"
          style={{
            backgroundColor: `#ff444420`,
            border: `1px solid #ff444460`,
            color: "#ff6666",
          }}
        >
          <p className="font-medium mb-1">Floor Plan Image Not Found</p>
          <p className="text-xs opacity-80">
            Please add your warehouse floor plan image at:{" "}
            <code className="bg-black/30 px-1 rounded">/public/assets/Logos/new_office_warehouse.png</code>
          </p>
        </div>
      )}

      {/* Canvas Container */}
      <div
        ref={canvasRef}
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundColor: colors.backgroundCard,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Bottom Left Controls */}
        <div className="absolute left-4 bottom-4 flex gap-2 z-50">
          <AppIconButton
            variant="default"
            onClick={centerCanvas}
            icon={SquareSquare}
            label="Re-Center"
          />
        </div>

        {/* Bottom Right Controls */}
        <div className="absolute right-4 bottom-4 flex gap-2 z-50 items-center">
          <AppTooltip label="Zoom In">
            <div
              className="w-9 h-9 grid items-center justify-center rounded-lg cursor-pointer transition-colors"
              style={{ backgroundColor: colors.backgroundElevated }}
              onClick={zoomIn}
            >
              <Plus size={18} style={{ color: colors.text }} />
            </div>
          </AppTooltip>
          <AppTooltip label="Zoom Out">
            <div
              className="w-9 h-9 grid items-center justify-center rounded-lg cursor-pointer transition-colors"
              style={{ backgroundColor: colors.backgroundElevated }}
              onClick={zoomOut}
            >
              <Minus size={18} style={{ color: colors.text }} />
            </div>
          </AppTooltip>
          <AppTooltip label="Reset Zoom">
            <div
              className="w-9 h-9 grid items-center justify-center rounded-lg cursor-pointer transition-colors"
              style={{ backgroundColor: colors.backgroundElevated }}
              onClick={resetZoom}
            >
              <RotateCcw size={18} style={{ color: colors.text }} />
            </div>
          </AppTooltip>
          <div
            className="ml-2 text-sm px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: colors.backgroundElevated,
              color: colors.textMuted,
            }}
          >
            {(zoom * 100).toFixed(0)}%
          </div>
        </div>

        {/* Fabric Canvas */}
        <div style={{ height: "70vh", width: "100%" }}>
          <FabricJSCanvas
            className="rounded-xl h-full w-full"
            onReady={onReady}
          />
        </div>
      </div>

      {/* Instructions */}
      <div
        className="mt-4 p-4 rounded-lg text-sm"
        style={{
          backgroundColor: colors.backgroundCard,
          border: `1px solid ${colors.border}`,
          color: colors.textMuted,
        }}
      >
        <p className="font-medium mb-2" style={{ color: colors.text }}>
          Navigation Controls
        </p>
        <ul className="space-y-1 text-xs">
          <li>• <strong>Scroll</strong> - Pan vertically</li>
          <li>• <strong>Shift + Scroll</strong> - Pan horizontally</li>
          <li>• <strong>Ctrl + Scroll</strong> - Zoom in/out</li>
          <li>• <strong>Space + Drag</strong> - Pan freely</li>
          <li>• <strong>Middle Mouse + Drag</strong> - Pan freely</li>
        </ul>
      </div>
    </div>
  );
}

export default WarehouseIndoorPositioningTab;
