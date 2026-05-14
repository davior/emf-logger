import { useEffect, useRef, useState } from "react";
import WaterfallChart from "./WaterfallChart";
import SpectrumChart from "./SpectrumChart";

// Combine an array of sub-band readings (sorted by hz_low) into a single
// full-range reading that covers the complete sweep.
function assembleSweep(slices) {
  if (!slices.length) return null;
  const sorted = [...slices].sort((a, b) => a.hz_low - b.hz_low);
  return {
    time: sorted[0].time,
    hz_low: sorted[0].hz_low,
    hz_high: sorted[sorted.length - 1].hz_high,
    hz_step: sorted[0].hz_step,
    db_values: sorted.flatMap((r) => r.db_values),
  };
}

export default function LiveView({ jobId }) {
  const waterfallRef = useRef(null);
  const [latestSweep, setLatestSweep] = useState(null);
  const [connected, setConnected] = useState(false);
  // Buffer of sub-band slices accumulating for the current sweep pass
  const sweepBuf = useRef([]);

  useEffect(() => {
    if (!jobId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/jobs/${jobId}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (evt) => {
      try {
        const reading = JSON.parse(evt.data);
        const buf = sweepBuf.current;

        // Detect sweep boundary: hz_low going backwards means rtl_power has
        // wrapped around to the start of a new sweep pass.
        const lastSlice = buf[buf.length - 1];
        if (lastSlice && reading.hz_low <= lastSlice.hz_low) {
          // Previous sweep is complete — assemble and display it
          const assembled = assembleSweep(buf);
          if (assembled) {
            setLatestSweep(assembled);
            waterfallRef.current?.pushReading(assembled);
          }
          sweepBuf.current = [reading];
        } else {
          sweepBuf.current = [...buf, reading];
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
      sweepBuf.current = [];
      setConnected(false);
    };
  }, [jobId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-gray-600"}`}
        />
        <span className={connected ? "text-green-400" : "text-gray-500"}>
          {connected ? "Live" : "Disconnected"}
        </span>
        {latestSweep && (
          <span className="text-gray-400 ml-2">
            {(latestSweep.hz_low / 1e6).toFixed(3)} –{" "}
            {(latestSweep.hz_high / 1e6).toFixed(3)} MHz ·{" "}
            {latestSweep.time}
          </span>
        )}
      </div>

      <div className="card">
        <p className="text-xs text-gray-500 mb-2">Waterfall (newest at top)</p>
        <WaterfallChart ref={waterfallRef} />
      </div>

      <div className="card">
        <p className="text-xs text-gray-500 mb-2">Latest sweep</p>
        <SpectrumChart reading={latestSweep} />
      </div>
    </div>
  );
}
