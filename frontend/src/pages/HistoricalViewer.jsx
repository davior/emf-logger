import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getJob, getReadings, getTimestamps, downloadUrl } from "../api/client";
import WaterfallChart from "../components/WaterfallChart";
import SpectrumChart from "../components/SpectrumChart";
import StatusBadge from "../components/StatusBadge";

function fmtFreq(hz) {
  return `${(hz / 1e6).toFixed(3)} MHz`;
}

export default function HistoricalViewer() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [readings, setReadings] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [minDb, setMinDb] = useState(-120);
  const [maxDb, setMaxDb] = useState(-30);

  useEffect(() => {
    async function load() {
      try {
        const [j, ts] = await Promise.all([getJob(id), getTimestamps(id)]);
        setJob(j);
        setTimestamps(ts);

        if (ts.length > 0) {
          const data = await getReadings(id, { limit: 500 });
          setReadings(data);
        }
      } catch {
        toast.error("Failed to load job data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const selectedReading = readings[selectedIdx] ?? null;

  if (loading) {
    return (
      <div className="text-gray-500 text-sm py-10 text-center">Loading…</div>
    );
  }

  if (!job) {
    return (
      <div className="text-red-400 text-sm py-10 text-center">
        Job not found.{" "}
        <Link to="/" className="text-green-400 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/" className="text-gray-400 hover:text-gray-200 text-sm">
          ← Jobs
        </Link>
        <h1 className="text-xl font-semibold">{job.name}</h1>
        <StatusBadge status={job.status} />
        <span className="text-gray-400 text-sm">
          {fmtFreq(job.start_freq)} – {fmtFreq(job.end_freq)}
        </span>
        <div className="ml-auto flex gap-2">
          <a
            href={downloadUrl(id, "csv")}
            className="btn-ghost text-xs"
            download
          >
            ↓ CSV
          </a>
          <a
            href={downloadUrl(id, "json")}
            className="btn-ghost text-xs"
            download
          >
            ↓ JSON
          </a>
          <Link to={`/jobs/${id}/analysis`} className="btn-ghost text-xs">
            AI Analysis
          </Link>
        </div>
      </div>

      {readings.length === 0 ? (
        <div className="card text-gray-500 text-sm text-center py-10">
          No spectrum data recorded for this job.
        </div>
      ) : (
        <>
          {/* Colour scale controls */}
          <div className="card flex gap-6 items-center text-sm">
            <span className="text-gray-400">Colour scale:</span>
            <label className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Min dB</span>
              <input
                type="number"
                className="input w-24"
                value={minDb}
                onChange={(e) => setMinDb(Number(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Max dB</span>
              <input
                type="number"
                className="input w-24"
                value={maxDb}
                onChange={(e) => setMaxDb(Number(e.target.value))}
              />
            </label>
            <span className="text-gray-500 text-xs">
              {readings.length} sweeps loaded
            </span>
          </div>

          {/* Waterfall */}
          <div className="card">
            <p className="text-xs text-gray-500 mb-2">
              Waterfall — newest at top
            </p>
            <WaterfallChart
              readings={readings}
              minDb={minDb}
              maxDb={maxDb}
              height="400px"
            />
          </div>

          {/* Timeline scrubber */}
          <div className="card space-y-2">
            <p className="text-xs text-gray-500">
              Timeline scrubber — sweep {selectedIdx + 1} of {readings.length}
            </p>
            <input
              type="range"
              min={0}
              max={readings.length - 1}
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="w-full accent-green-500"
            />
            {selectedReading && (
              <p className="text-xs text-gray-400">
                {selectedReading.time} &nbsp;·&nbsp;{" "}
                {fmtFreq(selectedReading.hz_low)} –{" "}
                {fmtFreq(selectedReading.hz_high)}
              </p>
            )}
          </div>

          {/* Spectrum slice */}
          <div className="card">
            <p className="text-xs text-gray-500 mb-2">
              Spectrum slice at selected time
            </p>
            <SpectrumChart reading={selectedReading} />
          </div>
        </>
      )}
    </div>
  );
}
