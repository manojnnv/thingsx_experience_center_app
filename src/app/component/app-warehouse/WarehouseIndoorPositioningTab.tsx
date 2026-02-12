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
  const image = "/assets/new_office_warehouse.png";
  const canvasRef = useRef<HTMLDivElement>(null);
  const [allAsset, setAllAsset] = useState<Asset[]>([]);
  const siteID = useSelector((state: any) => state.orgDetails.siteId);

  // Canonical physical floor dimensions in centimeters
  const PHYS_FLOOR_WIDTH_CM = 523; // width in cm
  const PHYS_FLOOR_HEIGHT_CM = 427; // height in cm
  // Hard-coded vertical offset (pixels) applied to every plotted point's Y
  // Change this value to shift all live markers up/down on the canvas.
  const HARD_Y_OFFSET_PX = 100;

  const [floorOriginalSize, setFloorOriginalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [liveTracking, setLiveTracking] = useState(false);
  const [assetId, setAssetId] = useState<number>(7);
  const [selectAsset, setSelectedAsset] = useState<string>();
  console.log(selectAsset);

  // refs for SSE and marker
  const liveSourceRef = useRef<EventSource | null>(null);
  // support multiple markers keyed by asset id
  const liveMarkersRef = useRef<Record<string, fabric.Object>>({});

  // SSE reconnect backoff state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const onSelcteAsset = (asset: string | undefined) => {
    // console.log(asset);
    if (asset) {
      setSelectedAsset(asset); // wrap single value in array
    }
  };

  // URL base for SSE - change if your SSE path differs
  const SSE_URL_BASE =
    "https://tgx-app-api.dev.intellobots.com/v1/asset/live-tracking";

  // Helper to parse incoming payload robustly
  const parseSSEData = (data: any) => {
    // many APIs wrap the useful payload under .data or .payload etc
    try {
      if (!data) return null;
      // If the server already sends JSON object, keep it
      if (typeof data === "object") return data;
      // If it's a string, try parse
      return JSON.parse(data);
    } catch (e) {
      // fallback - return raw
      return data;
    }
  };

  // Dotted grid background (reused from other dashboard pages)
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

  // Update or create live marker on canvas.
  const updateLiveMarker = (raw: any) => {
    if (!editor?.canvas) return;
    const { canvas } = editor;
    try {
      // Accept either a single object or an array of asset objects
      const items = Array.isArray(raw) ? raw : [raw];

      // find the layout image on canvas (we stored isLayout flag earlier)
      const floor = canvas
        .getObjects()
        .find((o: any) => (o as any).isLayout) as any;
      if (!floor) return; // can't position without layout image

      const scale = (floor.scaleX || 1) as number;
      const left = (floor.left ?? 0) as number;
      const top = (floor.top ?? 0) as number;
      const origW = (floor as any).__originalWidth || floor.width || 0;
      const origH = (floor as any).__originalHeight || floor.height || 0;
      // physical dims stored on image (fallback to canonical constants)
      const physW = (floor as any).__physWidthCm || PHYS_FLOOR_WIDTH_CM;
      const physH = (floor as any).__physHeightCm || PHYS_FLOOR_HEIGHT_CM;
      const displayW = origW * scale;
      const displayH = origH * scale;

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
          Number(d.x ?? d.img_x ?? d.x_px ?? d.imgPx ?? d.longitude ?? 0) || 0;
        const rawY =
          Number(d.y ?? d.img_y ?? d.y_px ?? d.imgPy ?? d.latitude ?? 0) || 0;

        // Map incoming coordinates (assumed centimeters relative to the
        // physical floor size) to the displayed image rectangle. If the
        // payload is actually in pixels, fallback mapping will be used.
        let dispX = left;
        let dispY = top;

        if (physW > 0 && physH > 0) {
          // Support several common Y conventions:
          // 1) Center-origin coordinates (fourth-quadrant): rawY in [-physH/2..physH/2]
          //    map by shifting origin to image top: adjY = physH/2 + rawY
          // 2) Bottom-referenced negative Y: rawY < 0 and magnitude > physH/2
          //    map by interpreting negative as distance above bottom: adjY = physH + rawY
          // 3) Default: rawY already top-based (0..physH)
          let adjY = rawY;
          if (rawY >= -physH / 2 && rawY <= physH / 2) {
            // center-origin (common for Cartesian coordinates)
            adjY = physH / 2 + rawY;
          } else if (rawY < 0) {
            // bottom-referenced negative value
            adjY = Math.max(0, physH + rawY);
          }
          dispX = left + (rawX / physW) * displayW;
          dispY = top + (adjY / physH) * displayH;
        } else {
          // fallback: treat as image pixels
          // If rawY is negative in pixels, treat as measured from bottom
          let adjYpx = rawY;
          if (rawY >= -origH / 2 && rawY <= origH / 2) {
            // center-origin in pixels
            adjYpx = origH / 2 + rawY;
          } else if (rawY < 0) {
            adjYpx = Math.max(0, origH + rawY);
          }
          dispX = left + rawX * scale;
          dispY = top + adjYpx * scale;
        }

        // apply hard-coded vertical offset (pixels) to every plotted point
        dispY += HARD_Y_OFFSET_PX;

        // clamp to image display area so markers remain inside the floorplan
        const clampedX = Math.max(left, Math.min(left + displayW, dispX));
        const clampedY = Math.max(top, Math.min(top + displayH, dispY));

        const existing = liveMarkersRef.current[assetIdVal];
        if (!existing) {
          const marker = new fabric.Circle({
            left: clampedX,
            top: clampedY,
            radius: 8,
            fill: "rgba(0,122,255,0.95)",
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
          return;
        }

        // Animate existing marker to new position
        try {
          const marker = existing as fabric.Object & {
            left: number;
            top: number;
          };
          marker.animate(
            { left: clampedX },
            {
              duration: 300,
              onChange: canvas.requestRenderAll.bind(canvas),
              easing: fabric.util.ease.easeInOutQuad,
            }
          );
          marker.animate(
            { top: clampedY },
            {
              duration: 300,
              onChange: canvas.requestRenderAll.bind(canvas),
              easing: fabric.util.ease.easeInOutQuad,
            }
          );
        } catch (e) {
          try {
            (existing as any).set({ left: clampedX, top: clampedY });
          } catch (err) { }
        }
      });

      canvas.requestRenderAll();
    } catch (e) {
      // swallow parse/render errors
      console.error("updateLiveMarker error", e);
    }
  };

  // Start SSE connection
  const startLiveTracking = () => {
    if (!editor?.canvas) return;
    setLiveTracking(true);

    // Close any existing connection
    if (liveSourceRef.current) {
      try {
        liveSourceRef.current.close();
      } catch (e) { }
      liveSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    const openEventSource = () => {
      const url = `${SSE_URL_BASE}?asset_id=${encodeURIComponent(
        selectAsset || ""
      )}`;
      const source = new EventSource(url);

      source.onopen = () => {
        console.log("SSE open", url);
        reconnectAttemptsRef.current = 0;
      };

      source.onmessage = (ev) => {
        const parsed = parseSSEData(ev.data);
        // If server wraps actual payload under data property use parsed.data
        const payload = parsed?.data ?? parsed;
        updateLiveMarker(payload);
      };

      source.onerror = (err) => {
        console.warn("SSE error", err);
        // Close source to allow reconnect scheduling
        try {
          source.close();
        } catch (e) { }
        liveSourceRef.current = null;
        setLiveTracking(false);

        // Exponential backoff reconnect
        const attempt = reconnectAttemptsRef.current ?? 0;
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt)); // up to 30s
        reconnectAttemptsRef.current = attempt + 1;
        console.warn(`SSE will retry in ${delay}ms (attempt ${attempt + 1})`);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          openEventSource();
          setLiveTracking(true);
        }, delay);
      };

      liveSourceRef.current = source;
    };

    openEventSource();
  };

  // Stop SSE and remove marker
  const stopLiveTracking = () => {
    setLiveTracking(false);

    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (liveSourceRef.current) {
      try {
        liveSourceRef.current.close();
      } catch (e) { }
      liveSourceRef.current = null;
    }

    // remove all markers from canvas
    try {
      if (!editor?.canvas) return;
      const { canvas } = editor;
      Object.keys(liveMarkersRef.current || {}).forEach((k) => {
        try {
          const obj = liveMarkersRef.current[k];
          if (obj) canvas.remove(obj);
        } catch (e) { }
      });
      liveMarkersRef.current = {};
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
    const { canvas } = editor;
    canvas.setZoom(1);
    setZoom(1);
    canvas.absolutePan(new fabric.Point(0, 0));
    canvas.requestRenderAll();
  };

  // Canvas mouse wheel zoom (Ctrl to zoom, Shift for horizontal scroll, else vertical)
  useEffect(() => {
    if (!editor?.canvas) return;
    const { canvas } = editor;

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

    canvas.on("mouse:wheel", wheelHandler as any);
    return () => {
      canvas.off("mouse:wheel", wheelHandler as any);
    };
  }, [editor]);

  // Panning controls (spacebar for grab, middle mouse for pan)
  useEffect(() => {
    if (!editor?.canvas) return;
    const { canvas } = editor;
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

  // Load the floorplan image into the canvas and add corner refs
  useEffect(() => {
    if (!editor?.canvas) return;
    const { canvas } = editor;

    // remove previous floorplan if any
    try {
      const existing = canvas
        .getObjects()
        .find((o: any) => (o as any).isLayout);
      if (existing) {
        canvas.remove(existing);
      }
    } catch (e) { }

    try {
      const loader = new window.Image();
      loader.src = image as string;
      loader.onload = () => {
        const origW = loader.naturalWidth || loader.width || 0;
        const origH = loader.naturalHeight || loader.height || 0;
        if (origW && origH) setFloorOriginalSize({ w: origW, h: origH });

        fabric.Image.fromURL(image as string)
          .then((fimg: fabric.Image) => {
            try {
              const cW = canvas.getWidth() || 1;
              const cH = canvas.getHeight() || 1;
              const scale = Math.min(cW / origW, cH / origH, 1);
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
              // store the canonical physical size on the image so we can map
              // centimeter coordinates into pixels consistently
              (fimg as any).__physWidthCm = PHYS_FLOOR_WIDTH_CM;
              (fimg as any).__physHeightCm = PHYS_FLOOR_HEIGHT_CM;
              (fimg as any).isLayout = true;

              canvas.add(fimg);
              try {
                canvas.sendObjectToBack(fimg);
              } catch (e) { }

              // ensure dotted grid background is present beneath the floor
              try {
                setDottedGridBackground();
              } catch (e) { }

              // remove previous corner refs
              try {
                const old = canvas
                  .getObjects()
                  .filter((o: any) => (o as any).isCornerRef);
                old.forEach((o: any) => canvas.remove(o));
              } catch (e) { }

              // add 4 corner refs
              try {
                const margin = 12;
                const tlx = left + margin;
                const tly = top + margin;
                const trx = left + displayW - margin;
                const try_ = top + margin;
                const blx = left + margin;
                const bly = top + displayH - margin;
                const brx = left + displayW - margin;
                const bry = top + displayH - margin;

                const makeRef = (
                  x: number,
                  y: number,
                  labelText: string,
                  corner: string
                ) => {
                  const c = new fabric.Circle({
                    left: x,
                    top: y,
                    radius: 6,
                    fill: "#ff4d4f",
                    stroke: "#fff",
                    strokeWidth: 1,
                    originX: "center",
                    originY: "center",
                    selectable: true,
                    evented: true,
                  });
                  const txt = new fabric.Text(labelText, {
                    left: x + 10,
                    top: y - 6,
                    fontSize: 12,
                    fill: "#111",
                    originX: "left",
                    originY: "center",
                    selectable: false,
                    evented: false,
                  });
                  const group = new fabric.Group([c, txt], {
                    left: x,
                    top: y,
                    selectable: true,
                    evented: true,
                    hasControls: true,
                  });
                  try {
                    const scale = fimg.scaleX || 1;
                    (group as any).isCornerRef = true;
                    (group as any).corner = corner;
                    (group as any).displayX = x;
                    (group as any).displayY = y;
                    (group as any).imgX = Math.round((x - left) / scale);
                    (group as any).imgY = Math.round((y - top) / scale);
                  } catch (e) { }
                  canvas.add(group);
                  return group;
                };

                makeRef(tlx, tly, "TL", "top-left");
                makeRef(trx, try_, "TR", "top-right");
                makeRef(blx, bly, "BL", "bottom-left");
                makeRef(brx, bry, "BR", "bottom-right");
              } catch (e) { }

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
            try {
              canvas.sendObjectToBack(fimg);
            } catch (e) { }
            try {
              setDottedGridBackground();
            } catch (e) { }
            canvas.requestRenderAll();
          })
          .catch(() => { });
      };
    } catch (e) { }
  }, [editor, image]);

  // cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (liveSourceRef.current) {
        try {
          liveSourceRef.current.close();
        } catch (e) { }
        liveSourceRef.current = null;
      }
      // remove marker
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all assets
  useEffect(() => {
    try {
      setLoading(true);
      const fetchAssets = async () => {
        const response = await getAllAssetData(siteID);
        // console.log(response);
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
    <div className="relative w-[99%] mx-auto ">
      {loading && (
        <div className="w-full h-screen absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-lg font-semibold">
            <AppLoading />
          </div>
        </div>
      )}
      <div className="text-[1.2rem] font-semibold" style={{ color: colors.text }}>Indoor Positioning</div>
      <div className="flex gap-2 justify-between items-end">
        <AppSelect
          className="w-64"
          label="Select Asset"
          onchange={onSelcteAsset}
          options={allAsset?.map((item: any, i: any) => ({
            label: item?.asset_name,
            value: String(item?.asset_id),
          }))}
        />
        <AppButton
          onClick={() => {
            if (liveTracking) stopLiveTracking();
            else startLiveTracking();
          }}
          variant="default"
          label={liveTracking ? "Stop Live" : "Live Tracking"}
        //   className={`px-3 py-1 rounded-md text-sm font-medium ${
        //     liveTracking ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        //   }`}
        >
          {/* {liveTracking ? "Stop Live" : "Live Tracking"} */}
        </AppButton>
      </div>
      <div>
        <div
          ref={canvasRef}
          className="flex-1 border border-black rounded-md m-2 relative"
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
              <div className="bg-black w-8 h-8 grid items-center justify-center rounded-md " style={{ backgroundColor: colors.backgroundElevated }}>
                <Plus className=" text-white" onClick={zoomIn} size={18} style={{ color: colors.text }} />
              </div>
            </AppTooltip>
            <AppTooltip label="Zoom Out">
              <div className="bg-black w-8 h-8 grid items-center justify-center rounded-md " style={{ backgroundColor: colors.backgroundElevated }}>
                <Minus className=" text-white" onClick={zoomOut} size={18} style={{ color: colors.text }} />
              </div>
            </AppTooltip>
            <AppTooltip label="Reset Zoom">
              <div className="bg-black w-8 h-8 grid items-center justify-center rounded-md " style={{ backgroundColor: colors.backgroundElevated }}>
                <RotateCcw
                  className=" text-white"
                  onClick={resetZoom}
                  size={18}
                  style={{ color: colors.text }}
                />
              </div>
            </AppTooltip>

            <div className="flex items-center gap-2">
              {/* <input
                type="number"
                value={assetId}
                onChange={(e) => setAssetId(Number(e.target.value))}
                className="w-16 h-8 text-sm rounded-md border px-2"
                title="Asset ID"
              /> */}

              {/* <button
                onClick={() => {
                  // sample payload from user for quick test
                  const sample = [
                    {
                      asset_id: "7",
                      asset_name: "pallete-2",
                      timestamp: "2025-09-16T14:00:03.339519+00:00",
                      x: 181.69639125976877,
                      y: 76.30366054125258,
                    },
                  ];
                  updateLiveMarker(sample);
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white`}
              >
                Plot Sample
              </button> */}
            </div>
          </div>

          <FabricJSCanvas
            className="sample-canvas border border-gray-300 rounded-md h-[80vh] w-full"
            onReady={onReady}
          />
        </div>
      </div>
    </div>
  );
}

export default WarehouseIndoorPositioningTab;
