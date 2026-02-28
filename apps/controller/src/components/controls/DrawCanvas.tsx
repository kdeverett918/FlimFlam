"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PRESET_COLORS = ["#FFFFFF", "#FF3366", "#00D4AA", "#FFB800", "#7B61FF", "#000000"];
const BRUSH_SIZES = [
  { label: "S", size: 3 },
  { label: "M", size: 8 },
  { label: "L", size: 16 },
];

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  size: number;
}

interface DrawCanvasProps {
  onStrokeSend: (stroke: { points: Point[]; color: string; size: number }) => void;
}

export function DrawCanvas({ onStrokeSend }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentColor, setCurrentColor] = useState<string>(PRESET_COLORS[0] ?? "#FFFFFF");
  const [currentSize, setCurrentSize] = useState<number>(BRUSH_SIZES[1]?.size ?? 8);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) {
      // Single point — draw a dot
      const pt = stroke.points[0];
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      }
      return;
    }

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const first = stroke.points[0];
    if (first) {
      ctx.moveTo(first.x, first.y);
    }
    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      if (point) {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear to white
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    // Draw current in-progress stroke
    if (currentStrokeRef.current.length > 0) {
      drawStroke(ctx, {
        points: currentStrokeRef.current,
        color: currentColor,
        size: currentSize,
      });
    }
  }, [strokes, currentColor, currentSize, drawStroke]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const width = container.clientWidth;
      const height = Math.round(width * 0.75); // 4:3 aspect ratio
      canvas.width = width * 2; // 2x for retina
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(2, 2);
      }
    };

    resizeCanvas();
    // Use a simple redraw after resize
    const timeoutId = setTimeout(redrawCanvas, 0);
    return () => clearTimeout(timeoutId);
  }, [redrawCanvas]);

  // Redraw whenever strokes change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      isDrawingRef.current = true;
      const point = getCanvasPoint(touch.clientX, touch.clientY);
      if (point) {
        currentStrokeRef.current = [point];
        redrawCanvas();
      }
    },
    [getCanvasPoint, redrawCanvas],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const point = getCanvasPoint(touch.clientX, touch.clientY);
      if (point) {
        currentStrokeRef.current.push(point);
        redrawCanvas();
      }
    },
    [getCanvasPoint, redrawCanvas],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;

      isDrawingRef.current = false;
      const points = [...currentStrokeRef.current];
      currentStrokeRef.current = [];

      if (points.length > 0) {
        const newStroke: Stroke = {
          points,
          color: currentColor,
          size: currentSize,
        };
        setStrokes((prev) => [...prev, newStroke]);

        // Normalize points to 0-1 range for network send
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const normalizedPoints = points.map((p) => ({
            x: p.x / rect.width,
            y: p.y / rect.height,
          }));
          onStrokeSend({ points: normalizedPoints, color: currentColor, size: currentSize });
        }
      }
    },
    [currentColor, currentSize, onStrokeSend],
  );

  // Mouse fallback for non-touch devices
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDrawingRef.current = true;
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) {
        currentStrokeRef.current = [point];
        redrawCanvas();
      }
    },
    [getCanvasPoint, redrawCanvas],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawingRef.current) return;
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) {
        currentStrokeRef.current.push(point);
        redrawCanvas();
      }
    },
    [getCanvasPoint, redrawCanvas],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    const points = [...currentStrokeRef.current];
    currentStrokeRef.current = [];

    if (points.length > 0) {
      const newStroke: Stroke = {
        points,
        color: currentColor,
        size: currentSize,
      };
      setStrokes((prev) => [...prev, newStroke]);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const normalizedPoints = points.map((p) => ({
          x: p.x / rect.width,
          y: p.y / rect.height,
        }));
        onStrokeSend({ points: normalizedPoints, color: currentColor, size: currentSize });
      }
    }
  }, [currentColor, currentSize, onStrokeSend]);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
  }, []);

  return (
    <div className="flex w-full flex-col gap-3 px-4">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border-2 border-text-muted/20"
      >
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="touch-none"
          style={{ display: "block" }}
        />
      </div>

      {/* Color picker */}
      <div className="flex items-center justify-center gap-3">
        {PRESET_COLORS.map((color) => {
          const isSelected = currentColor === color;
          return (
            <button
              key={color}
              type="button"
              onClick={() => setCurrentColor(color)}
              className={`h-10 w-10 rounded-full border-3 transition-transform active:scale-90 ${
                isSelected ? "scale-110 border-accent-2" : "border-text-muted/30"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
              aria-pressed={isSelected}
            />
          );
        })}
      </div>

      {/* Brush size + actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {BRUSH_SIZES.map((brush) => {
            const isSelected = currentSize === brush.size;
            return (
              <button
                key={brush.label}
                type="button"
                onClick={() => setCurrentSize(brush.size)}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 font-medium transition-all active:scale-90 ${
                  isSelected
                    ? "border-accent-1 bg-accent-1/15 text-accent-1"
                    : "border-text-muted/20 bg-bg-card text-text-muted"
                }`}
              >
                {brush.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="flex h-12 items-center gap-1 rounded-lg border-2 border-text-muted/20 bg-bg-card px-4 text-sm text-text-muted transition-all active:scale-90 disabled:opacity-30"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              role="img"
            >
              <title>Undo</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5"
              />
            </svg>
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="flex h-12 items-center gap-1 rounded-lg border-2 border-text-muted/20 bg-bg-card px-4 text-sm text-text-muted transition-all active:scale-90 disabled:opacity-30"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
