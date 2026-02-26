"use client";
import AppLoading from "@/app/component/app-loading/AppLoading";
import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { FabricJSCanvas, useFabricJSEditor } from "fabricjs-react";
import AppTooltip from "@/app/component/app-tooltip/AppTooltip";
import { Minus, Plus, RotateCcw, SquareSquare } from "lucide-react";
import AppIconButton from "@/app/component/app-icon-button/AppIconButton";
import AppSelect from "@/app/component/app-select/AppSelect";
import { getAllAssetData, Asset } from "@/app/services/assets/asset";
import { useSelector } from "react-redux";
import AppButton from "@/app/component/app-button/AppButton";
import { colors } from "@/config/theme";

interface WarehouseIndoorPositioningTabProps {
  accentColor?: string;
}

function WarehouseIndoorPositioningTab({ accentColor }: WarehouseIndoorPositioningTabProps) {
  const [loading, setLoading] = useState(false);
  const { editor, onReady } = useFabricJSEditor();
  const image = "/assets/Warehouse Layout Preview.svg";
  const canvasRef = useRef<HTMLDivElement>(null);
  const [allAsset, setAllAsset] = useState<Asset[]>([]);
  const siteID = useSelector((state: any) => state.orgDetails.siteId);

  // Physical floor dimensions in centimeters
  const PHYS_FLOOR_WIDTH_CM = 523;
  const PHYS_FLOOR_HEIGHT_CM = 427;

  const [zoom, setZoom] = useState(1);
  const [liveTracking, setLiveTracking] = useState(false);
  const [selectAsset, setSelectedAsset] = useState<string>();

  // refs for SSE and marker
  const liveSourceRef = useRef<{ close: () => void } | null>(null);
  const liveMarkersRef = useRef<Record<string, fabric.Object>>({});

  // SSE reconnect backoff state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const onSelectAsset = (asset: string | undefined) => {
    if (asset) {
      setSelectedAsset(asset);
    }
  };

  const SSE_URL_BASE =
    "https://tgx-app-api.dev.intellobots.com/v1/asset/live-tracking";

  const parseSSEData = (data: any) => {
    try {
      if (!data) return null;
      if (typeof data === "object") return data;
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
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

    const pattern = new fabric.Pattern({
      source: gridCanvas,
      repeat: "repeat",
    });

    editor.canvas.backgroundColor = pattern;
    editor.canvas.requestRenderAll();
  };

  // Top-left origin coordinate mapping:
  //   x: 0 to 523 maps to left → left + displayW
  //   y: 0 to -427 maps to top → top + displayH (negative values go DOWN)
  const updateLiveMarker = (raw: any) => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;

    try {
      const items = Array.isArray(raw) ? raw : [raw];
      const floor = canvas.getObjects().find((o: any) => o.isLayout) as any;
      if (!floor) return;

      const scale = (floor.scaleX || 1) as number;
      const left = (floor.left ?? 0) as number;
      const top = (floor.top ?? 0) as number;
      const origW = (floor as any).__originalWidth || floor.width || 0;
      const displayW = origW * scale;
      const displayH = ((floor as any).__originalHeight || floor.height || 0) * scale;

      items.forEach((rawItem: any) => {
        const d = rawItem?.data ?? rawItem ?? {};
        const assetIdVal = String(
          rawItem.asset_id ??
          rawItem.assetId ??
          d.asset_id ??
          d.assetId ??
          d.id ??
          Math.random()
        );

        const rawX =
          parseFloat(d.x ?? d.img_x ?? d.x_px ?? d.imgPx ?? d.longitude ?? 0) || 0;
        const rawY =
          parseFloat(d.y ?? d.img_y ?? d.y_px ?? d.imgPy ?? d.latitude ?? 0) || 0;

        const dispX = left + (rawX / PHYS_FLOOR_WIDTH_CM) * displayW;
        // y is negative going down: convert -y to positive distance from top
        const positiveY = -rawY;
        const dispY = top + (positiveY / PHYS_FLOOR_HEIGHT_CM) * displayH;

        const clampedX = Math.max(left, Math.min(left + displayW, dispX));
        const clampedY = Math.max(top, Math.min(top + displayH, dispY));

        const existing = liveMarkersRef.current[assetIdVal];
        if (!existing) {
          const marker = new fabric.Circle({
            left: clampedX,
            top: clampedY,
            radius: 8,
            fill: "rgba(255, 0, 0, 0.95)",
            stroke: "#fff",
            strokeWidth: 2,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
          });
          (marker as any).assetId = assetIdVal;
          canvas.add(marker);
          liveMarkersRef.current[assetIdVal] = marker;

          const label = new fabric.Text(
            `${rawX.toFixed(0)},${rawY.toFixed(0)}`,
            {
              left: clampedX + 15,
              top: clampedY - 10,
              fontSize: 12,
              fill: "#000",
              backgroundColor: "rgba(255,255,255,0.7)",
              selectable: false,
              evented: false,
            }
          );
          (label as any).isCoordLabel = true;
          canvas.add(label);
          return;
        }

        try {
          (existing as any).set({ left: clampedX, top: clampedY });
          canvas.requestRenderAll();
        } catch (err) {
          console.error("Error updating marker:", err);
        }
      });

      canvas.requestRenderAll();
    } catch (e) {
      console.error("updateLiveMarker error", e);
    }
  };

  // SSE via fetch (supports auth token)
  const startLiveTracking = () => {
    if (!editor?.canvas) return;

    if (!selectAsset) {
      alert("Please select an asset first");
      return;
    }

    setLiveTracking(true);

    if (liveSourceRef.current) {
      try { liveSourceRef.current.close(); } catch (e) { }
      liveSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    const openEventSource = () => {
      const url = `${SSE_URL_BASE}?asset_id=${encodeURIComponent(selectAsset)}`;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;
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
                const parsed = parseSSEData(data.trim());
                const payload = parsed?.data ?? parsed;
                updateLiveMarker(payload);
              }
            }
          }
        } catch (err: any) {
          if (signal.aborted) return;
          console.warn("SSE error", err);
          liveSourceRef.current = null;
          setLiveTracking(false);

          const attempt = reconnectAttemptsRef.current ?? 0;
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          reconnectAttemptsRef.current = attempt + 1;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            openEventSource();
            setLiveTracking(true);
          }, delay);
        }
      };

      start();

      liveSourceRef.current = {
        close: () => controller.abort(),
      };
    };

    openEventSource();
  };

  const stopLiveTracking = () => {
    setLiveTracking(false);

    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (liveSourceRef.current) {
      try { liveSourceRef.current.close(); } catch (e) { }
      liveSourceRef.current = null;
    }

    try {
      if (!editor?.canvas) return;
      const canvas = editor.canvas;
      Object.keys(liveMarkersRef.current || {}).forEach((k) => {
        try {
          const obj = liveMarkersRef.current[k];
          if (obj) canvas.remove(obj);
        } catch (e) { }
      });
      liveMarkersRef.current = {};

      const labels = canvas.getObjects().filter((obj: any) => obj.isCoordLabel);
      labels.forEach((obj: any) => canvas.remove(obj));

      canvas.requestRenderAll();
    } catch (e) { }
  };

  // Zoom control helpers
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

  // Mouse wheel: Ctrl+scroll = zoom, Shift+scroll = horizontal pan, scroll = vertical pan
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
      } else if (e.shiftKey) {
        const vpt = canvas.viewportTransform!;
        vpt[4] += -delta;
        canvas.requestRenderAll();
        e.preventDefault();
        e.stopPropagation();
      } else {
        const vpt = canvas.viewportTransform!;
        vpt[5] += -delta;
        canvas.requestRenderAll();
        e.preventDefault();
        e.stopPropagation();
      }
    };

    canvas.on("mouse:wheel", wheelHandler as any);
    return () => {
      canvas.off("mouse:wheel", wheelHandler as any);
    };
  }, [editor]);

  // Panning controls (spacebar for grab, middle mouse for pan)
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

    canvas.on("mouse:down", handleFabricMouseDown as any);
    canvas.on("mouse:move", handleMouseMove as any);
    canvas.on("mouse:up", handleFabricMouseUp as any);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      canvasElement.removeEventListener("mousedown", handleCanvasMouseDown);
      canvasElement.removeEventListener("mouseup", handleCanvasMouseUp);
      canvas.off("mouse:down", handleFabricMouseDown as any);
      canvas.off("mouse:move", handleMouseMove as any);
      canvas.off("mouse:up", handleFabricMouseUp as any);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [editor]);

  // Load the floorplan image into the canvas
  useEffect(() => {
    if (!editor?.canvas) return;
    const canvas = editor.canvas;

    try {
      const existing = canvas.getObjects().find((o: any) => o.isLayout);
      if (existing) canvas.remove(existing);
    } catch (e) { }

    try {
      const loader = new window.Image();
      loader.src = image as string;
      loader.onload = () => {
        const origW = loader.naturalWidth || loader.width || 0;
        const origH = loader.naturalHeight || loader.height || 0;

        fabric.Image.fromURL(image as string)
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
              (fimg as any).__originalWidth = origW;
              (fimg as any).__originalHeight = origH;
              (fimg as any).isLayout = true;

              canvas.add(fimg);
              try { canvas.sendObjectToBack(fimg); } catch (e) { }

              try { setDottedGridBackground(); } catch (e) { }

              // Corner coordinate labels
              const corners = [
                { x: left, y: top, label: "TL (0,0)", color: "red" },
                { x: left + displayW, y: top, label: "TR (523,0)", color: "blue" },
                { x: left, y: top + displayH, label: "BL (0,-427)", color: "green" },
                { x: left + displayW, y: top + displayH, label: "BR (523,-427)", color: "purple" },
              ];

              corners.forEach((corner) => {
                const circle = new fabric.Circle({
                  left: corner.x - 5,
                  top: corner.y - 5,
                  radius: 5,
                  fill: corner.color,
                  stroke: "#fff",
                  strokeWidth: 1,
                  selectable: false,
                  evented: false,
                });
                const text = new fabric.Text(corner.label, {
                  left: corner.x + 10,
                  top: corner.y - 10,
                  fontSize: 12,
                  fill: corner.color,
                  backgroundColor: "rgba(255,255,255,0.7)",
                  selectable: false,
                  evented: false,
                });
                canvas.add(circle);
                canvas.add(text);
              });

              canvas.requestRenderAll();
            } catch (e) { }
          })
          .catch(() => { });
      };
      loader.onerror = () => {
        fabric.Image.fromURL(image as string)
          .then((fimg: fabric.Image) => {
            fimg.set({ left: 0, top: 0, selectable: false, evented: false });
            (fimg as any).isLayout = true;
            canvas.add(fimg);
            try { canvas.sendObjectToBack(fimg); } catch (e) { }
            try { setDottedGridBackground(); } catch (e) { }
            canvas.requestRenderAll();
          })
          .catch(() => { });
      };
    } catch (e) { }
  }, [editor, image]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (liveSourceRef.current) {
        try { liveSourceRef.current.close(); } catch (e) { }
        liveSourceRef.current = null;
      }

      if (editor?.canvas) {
        try {
          Object.keys(liveMarkersRef.current || {}).forEach((k) => {
            try {
              const obj = liveMarkersRef.current[k];
              if (obj) editor.canvas.remove(obj);
            } catch (e) { }
          });
        } catch (e) { }
        liveMarkersRef.current = {};
      }
    };
  }, [editor]);

  // Fetch all assets
  useEffect(() => {
    try {
      setLoading(true);
      const fetchAssets = async () => {
        const response = await getAllAssetData(siteID);
        const activeAsset = response?.filter(
          (asset: any) => asset?.active_tracking
        );
        setAllAsset(activeAsset);
      };
      fetchAssets();
    } catch (error) {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [siteID]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {loading && (
        <div className="w-full h-full absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-lg font-semibold">
            <AppLoading />
          </div>
        </div>
      )}
      <div className="flex-none text-[1.2rem] font-semibold py-1" style={{ color: colors.text }}>Indoor Positioning</div>
      <div className="flex-none flex gap-2 justify-between items-end pb-1">
        <AppSelect
          className="w-64"
          label="Select Asset"
          value={selectAsset}
          onchange={onSelectAsset}
          options={allAsset?.map((item: any) => ({
            label: item?.asset_name,
            value: String(item?.asset_id),
          }))}
        />
        <AppButton
          onClick={() => {
            if (liveTracking) stopLiveTracking();
            else startLiveTracking();
          }}
          variant={liveTracking ? "destructive" : "default"}
          label={liveTracking ? "Stop Live" : "Live Tracking"}
        >
        </AppButton>
      </div>
      <div className="flex-1 min-h-0">
        <div
          ref={canvasRef}
          className="h-full border rounded-md relative overflow-hidden"
          style={{ borderColor: colors.border }}
        >
          <div className="absolute left-5 bottom-5 flex gap-1 z-50">
            <AppIconButton
              variant="default"
              onClick={centerCanvas}
              icon={SquareSquare}
              label="Re-Center"
            />
          </div>

          <div className="absolute right-5 bottom-5 flex gap-1 z-50">
            <AppTooltip label="Zoom In">
              <div className="w-8 h-8 grid items-center justify-center rounded-md" style={{ backgroundColor: colors.backgroundElevated }}>
                <Plus onClick={zoomIn} size={18} style={{ color: colors.text }} />
              </div>
            </AppTooltip>
            <AppTooltip label="Zoom Out">
              <div className="w-8 h-8 grid items-center justify-center rounded-md" style={{ backgroundColor: colors.backgroundElevated }}>
                <Minus onClick={zoomOut} size={18} style={{ color: colors.text }} />
              </div>
            </AppTooltip>
            <AppTooltip label="Reset Zoom">
              <div className="w-8 h-8 grid items-center justify-center rounded-md" style={{ backgroundColor: colors.backgroundElevated }}>
                <RotateCcw
                  onClick={resetZoom}
                  size={18}
                  style={{ color: colors.text }}
                />
              </div>
            </AppTooltip>
          </div>

          <FabricJSCanvas
            className="sample-canvas border border-gray-300 rounded-md h-full w-full"
            onReady={onReady}
          />
        </div>
      </div>
    </div>
  );
}

export default WarehouseIndoorPositioningTab;
