import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { createJob, updateJob, getJob } from "../api/client";

const EMPTY = {
  name: "",
  start_freq_mhz: "88",
  end_freq_mhz: "108",
  bin_size_khz: "100",
  interval: "1",
  gain: "",
  device_index: "0",
  ppm_correction: "0",
  scheduled_start: "",
  scheduled_end: "",
};

function mhzToHz(mhz) {
  return Math.round(parseFloat(mhz) * 1e6);
}

export default function JobCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(id);

  useEffect(() => {
    if (!isEdit) return;
    getJob(id)
      .then((job) => {
        setForm({
          name: job.name,
          start_freq_mhz: String(job.start_freq / 1e6),
          end_freq_mhz: String(job.end_freq / 1e6),
          bin_size_khz: String(job.bin_size / 1e3),
          interval: String(job.interval),
          gain: job.gain != null ? String(job.gain) : "",
          device_index: String(job.device_index),
          ppm_correction: String(job.ppm_correction),
          scheduled_start: job.scheduled_start
            ? job.scheduled_start.slice(0, 16)
            : "",
          scheduled_end: job.scheduled_end
            ? job.scheduled_end.slice(0, 16)
            : "",
        });
      })
      .catch(() => toast.error("Failed to load job"));
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: form.name,
      start_freq: mhzToHz(form.start_freq_mhz),
      end_freq: mhzToHz(form.end_freq_mhz),
      bin_size: Math.round(parseFloat(form.bin_size_khz) * 1e3),
      interval: parseInt(form.interval, 10),
      gain: form.gain === "" ? null : parseFloat(form.gain),
      device_index: parseInt(form.device_index, 10),
      ppm_correction: parseInt(form.ppm_correction, 10),
      scheduled_start: form.scheduled_start ? form.scheduled_start + ":00Z" : null,
      scheduled_end: form.scheduled_end ? form.scheduled_end + ":00Z" : null,
    };

    try {
      if (isEdit) {
        await updateJob(id, payload);
        toast.success("Job updated");
      } else {
        await createJob(payload);
        toast.success("Job created");
      }
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">
        {isEdit ? "Edit Job" : "New Scan Job"}
      </h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {/* Name */}
        <div>
          <label className="label">Job name *</label>
          <input className="input" {...field("name")} required />
        </div>

        {/* Frequency range */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-medium text-gray-400 mb-1">
            Frequency range
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Start (MHz) *</label>
              <input
                type="number"
                className="input"
                step="0.001"
                min="0"
                {...field("start_freq_mhz")}
                required
              />
            </div>
            <div>
              <label className="label">End (MHz) *</label>
              <input
                type="number"
                className="input"
                step="0.001"
                min="0"
                {...field("end_freq_mhz")}
                required
              />
            </div>
            <div>
              <label className="label">Bin size (kHz) *</label>
              <input
                type="number"
                className="input"
                step="0.001"
                min="0.001"
                {...field("bin_size_khz")}
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Timing */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Integration interval (s) *</label>
            <input
              type="number"
              className="input"
              min="1"
              {...field("interval")}
              required
            />
          </div>
          <div>
            <label className="label">Gain (dB, blank = auto)</label>
            <input
              type="number"
              className="input"
              step="0.1"
              placeholder="auto"
              {...field("gain")}
            />
          </div>
          <div>
            <label className="label">Device index</label>
            <input type="number" className="input" min="0" {...field("device_index")} />
          </div>
          <div>
            <label className="label">PPM correction</label>
            <input type="number" className="input" {...field("ppm_correction")} />
          </div>
        </div>

        {/* Schedule */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-medium text-gray-400 mb-1">
            Schedule (optional — leave blank to start manually)
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start at</label>
              <input
                type="datetime-local"
                className="input"
                {...field("scheduled_start")}
              />
            </div>
            <div>
              <label className="label">End at</label>
              <input
                type="datetime-local"
                className="input"
                {...field("scheduled_end")}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex gap-3 pt-1">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create job"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
