import { useEffect, useRef, useState } from "react";
import WaterfallChart from "./WaterfallChart";
import SpectrumChart from "./SpectrumChart";

export default function LiveView({ jobId }) {
  const waterfallRef = useRef(null);
  const [latestReading, setLatestReading] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/jobs/${jobId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (evt) => {
      try {
        const reading = JSON.parse(evt.data);
        setLatestReading(reading);
        waterfallRef.current?.pushReading(reading);
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
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
        {latestReading && (
          <span className="text-gray-400 ml-2">
            {(latestReading.hz_low / 1e6).toFixed(3)} –{" "}
            {(latestReading.hz_high / 1e6).toFixed(3)} MHz ·{" "}
            {latestReading.time}
          </span>
        )}
      </div>

      <div className="card">
        <p className="text-xs text-gray-500 mb-2">Waterfall (newest at top)</p>
        <WaterfallChart ref={waterfallRef} />
      </div>

      <div className="card">
        <p className="text-xs text-gray-500 mb-2">Latest sweep</p>
        <SpectrumChart reading={latestReading} />
      </div>
    </div>
  );
}
