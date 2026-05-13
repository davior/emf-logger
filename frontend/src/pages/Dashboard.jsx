import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getJobs, startJob, stopJob, deleteJob } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import LiveView from "../components/LiveView";

function fmtFreq(hz) {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`;
  return `${(hz / 1e3).toFixed(1)} kHz`;
}

function fmtDuration(start, end) {
  if (!start) return "—";
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [liveJobId, setLiveJobId] = useState(null);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    try {
      setJobs(await getJobs());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleStart = async (job) => {
    try {
      await startJob(job.id);
      toast.success(`Started "${job.name}"`);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Failed to start job");
    }
  };

  const handleStop = async (job) => {
    try {
      await stopJob(job.id);
      toast.success(`Stopped "${job.name}"`);
      if (liveJobId === job.id) setLiveJobId(null);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Failed to stop job");
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete job "${job.name}"?`)) return;
    try {
      await deleteJob(job.id);
      toast.success("Deleted");
      if (liveJobId === job.id) setLiveJobId(null);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Failed to delete job");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Scan Jobs</h1>
        <Link to="/jobs/new" className="btn-primary">
          + New Job
        </Link>
      </div>

      {liveJobId && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-green-400">Live View</h2>
            <button
              className="btn-ghost text-xs"
              onClick={() => setLiveJobId(null)}
            >
              Close
            </button>
          </div>
          <LiveView jobId={liveJobId} />
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          No jobs yet.{" "}
          <Link to="/jobs/new" className="text-green-400 hover:underline">
            Create one
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Range</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Duration</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-800/40">
                  <td className="py-2 pr-4 font-medium">{job.name}</td>
                  <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                    {fmtFreq(job.start_freq)} – {fmtFreq(job.end_freq)}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {fmtDuration(job.actual_start, job.actual_end)}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2 flex-wrap">
                      {job.status === "running" && (
                        <>
                          <button
                            className="btn-ghost text-xs"
                            onClick={() =>
                              setLiveJobId(
                                liveJobId === job.id ? null : job.id
                              )
                            }
                          >
                            {liveJobId === job.id ? "Hide Live" : "Live"}
                          </button>
                          <button
                            className="btn-danger text-xs"
                            onClick={() => handleStop(job)}
                          >
                            Stop
                          </button>
                        </>
                      )}
                      {["pending", "completed", "failed", "cancelled"].includes(
                        job.status
                      ) && (
                        <button
                          className="btn-primary text-xs"
                          onClick={() => handleStart(job)}
                        >
                          Start
                        </button>
                      )}
                      {["completed", "cancelled", "failed"].includes(
                        job.status
                      ) && (
                        <button
                          className="btn-ghost text-xs"
                          onClick={() =>
                            navigate(`/jobs/${job.id}/view`)
                          }
                        >
                          View
                        </button>
                      )}
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => navigate(`/jobs/${job.id}/edit`)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-ghost text-xs"
                        onClick={() =>
                          navigate(`/jobs/${job.id}/analysis`)
                        }
                      >
                        AI
                      </button>
                      <button
                        className="btn-danger text-xs"
                        onClick={() => handleDelete(job)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
