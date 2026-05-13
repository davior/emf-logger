import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

// Map a normalised [0,1] value to an RGB colour using a jet-like palette.
function norm2rgb(v) {
  const r = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * v - 3))));
  const g = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * v - 2))));
  const b = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * v - 1))));
  return [r, g, b];
}

const MAX_ROWS = 300;

/**
 * WaterfallChart – canvas-based waterfall display.
 *
 * Props:
 *   readings  – array of spectrum reading objects (for historical mode)
 *   minDb     – colour scale minimum (default -120)
 *   maxDb     – colour scale maximum (default -30)
 *
 * Ref methods:
 *   pushReading(reading) – append a single live reading
 *   clear()              – reset the buffer
 */
const WaterfallChart = forwardRef(function WaterfallChart(
  { readings, minDb = -120, maxDb = -30 },
  ref
) {
  const canvasRef = useRef(null);
  // Each entry is an array of dBm floats (one row = one frequency sweep)
  const rowBuf = useRef([]);

  useImperativeHandle(ref, () => ({
    pushReading(reading) {
      rowBuf.current.unshift(reading.db_values);
      if (rowBuf.current.length > MAX_ROWS) rowBuf.current.length = MAX_ROWS;
      drawCanvas();
    },
    clear() {
      rowBuf.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
  }));

  // Populate from `readings` prop (historical)
  useEffect(() => {
    if (!readings || readings.length === 0) return;
    // Newest first so the canvas draws newest at top
    rowBuf.current = [...readings]
      .reverse()
      .slice(0, MAX_ROWS)
      .map((r) => r.db_values);
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings]);

  function drawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || rowBuf.current.length === 0) return;

    const rows = rowBuf.current;
    const cols = rows[0].length;
    canvas.width = cols;
    canvas.height = rows.length;

    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(cols, rows.length);
    const data = imgData.data;

    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < cols; x++) {
        const db = row[x] ?? minDb;
        const norm = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
        const [r, g, b] = norm2rgb(norm);
        const idx = (y * cols + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  return (
    <div className="overflow-auto rounded bg-black">
      {rowBuf.current.length === 0 && (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
          Waiting for spectrum data…
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ imageRendering: "pixelated", width: "100%", display: "block" }}
      />
    </div>
  );
});

export default WaterfallChart;
