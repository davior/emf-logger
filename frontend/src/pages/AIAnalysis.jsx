import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getJob,
  getTemplates,
  submitAnalysis,
  getAnalysis,
  listJobAnalyses,
} from "../api/client";

const TEMPLATE_LABELS = {
  anomaly_detection: "Anomaly Detection",
  signal_identification: "Signal Identification",
  band_activity_summary: "Band Activity Summary",
};

function AnalysisCard({ a, onRefresh }) {
  const [polling, setPolling] = useState(
    a.status === "pending" || a.status === "running"
  );

  useEffect(() => {
    if (!polling) return;
    const iv = setInterval(async () => {
      try {
        const fresh = await getAnalysis(a.id);
        if (fresh.status === "completed" || fresh.status === "failed") {
          setPolling(false);
          onRefresh();
        }
      } catch {
        setPolling(false);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [polling, a.id, onRefresh]);

  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">
          {TEMPLATE_LABELS[a.prompt_template] ?? a.prompt_template}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            a.status === "completed"
              ? "bg-blue-900 text-blue-200"
              : a.status === "failed"
              ? "bg-red-900 text-red-200"
              : "bg-yellow-900 text-yellow-200 animate-pulse"
          }`}
        >
          {a.status}
        </span>
        <span className="text-gray-500 text-xs ml-auto">
          {new Date(a.created_at).toLocaleString()}
        </span>
      </div>
      {a.custom_prompt && (
        <p className="text-xs text-gray-400 italic">"{a.custom_prompt}"</p>
      )}
      {a.response && (
        <pre className="text-sm text-gray-200 whitespace-pre-wrap bg-gray-800 rounded p-3 leading-relaxed">
          {a.response}
        </pre>
      )}
      {(a.status === "pending" || a.status === "running") && (
        <p className="text-xs text-gray-500 animate-pulse">
          Processing…
        </p>
      )}
    </div>
  );
}

export default function AIAnalysis() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [form, setForm] = useState({
    template: "anomaly_detection",
    custom: "",
    time_start: "",
    time_end: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadAnalyses = useCallback(async () => {
    try {
      setAnalyses(await listJobAnalyses(id));
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    Promise.all([getJob(id), getTemplates()])
      .then(([j, t]) => {
        setJob(j);
        setTemplates(t);
      })
      .catch(() => toast.error("Failed to load"));
    loadAnalyses();
  }, [id, loadAnalyses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitAnalysis({
        job_id: id,
        prompt_template: form.template,
        custom_prompt: form.custom || null,
        time_start: form.time_start ? form.time_start + ":00Z" : null,
        time_end: form.time_end ? form.time_end + ":00Z" : null,
      });
      toast.success("Analysis submitted");
      setForm({ ...form, custom: "", time_start: "", time_end: "" });
      loadAnalyses();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-gray-400 hover:text-gray-200 text-sm">
          ← Jobs
        </Link>
        <h1 className="text-xl font-semibold">
          AI Analysis
          {job && (
            <span className="text-gray-400 font-normal text-base ml-2">
              — {job.name}
            </span>
          )}
        </h1>
      </div>

      {/* Submission form */}
      <div className="card">
        <h2 className="font-medium mb-4">New Analysis</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Prompt template</label>
            <select
              className="input"
              value={form.template}
              onChange={(e) => setForm({ ...form, template: e.target.value })}
            >
              {templates.map((t) => (
                <option key={t} value={t}>
                  {TEMPLATE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              Custom prompt (overrides template if filled)
            </label>
            <textarea
              className="input h-20 resize-none"
              value={form.custom}
              onChange={(e) => setForm({ ...form, custom: e.target.value })}
              placeholder="Optional: describe exactly what to analyse…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data start (optional)</label>
              <input
                type="datetime-local"
                className="input"
                value={form.time_start}
                onChange={(e) =>
                  setForm({ ...form, time_start: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Data end (optional)</label>
              <input
                type="datetime-local"
                className="input"
                value={form.time_end}
                onChange={(e) =>
                  setForm({ ...form, time_end: e.target.value })
                }
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Analysis"}
          </button>
        </form>
      </div>

      {/* Past analyses */}
      {analyses.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-sm text-gray-400">
            Past Analyses ({analyses.length})
          </h2>
          {analyses.map((a) => (
            <AnalysisCard key={a.id} a={a} onRefresh={loadAnalyses} />
          ))}
        </div>
      )}

      {analyses.length === 0 && (
        <p className="text-gray-500 text-sm">No analyses yet for this job.</p>
      )}
    </div>
  );
}
