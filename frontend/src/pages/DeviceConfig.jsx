import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  scanDevices,
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../api/client";

const EMPTY = {
  name: "",
  device_index: 0,
  gain: "",
  sample_rate: 2048000,
  ppm_correction: 0,
};

export default function DeviceConfig() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const loadProfiles = async () => {
    try {
      setProfiles(await getProfiles());
    } catch {
      toast.error("Failed to load profiles");
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      setDevices(await scanDevices());
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      gain: form.gain === "" ? null : Number(form.gain),
      device_index: Number(form.device_index),
      sample_rate: Number(form.sample_rate),
      ppm_correction: Number(form.ppm_correction),
    };
    try {
      if (editId) {
        await updateProfile(editId, payload);
        toast.success("Profile updated");
      } else {
        await createProfile(payload);
        toast.success("Profile created");
      }
      setForm(EMPTY);
      setEditId(null);
      loadProfiles();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Save failed");
    }
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({ ...p, gain: p.gain ?? "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this profile?")) return;
    try {
      await deleteProfile(id);
      toast.success("Deleted");
      loadProfiles();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold">Device Configuration</h1>

      {/* Device scanner */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Available Devices</h2>
          <button
            className="btn-primary"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? "Scanning…" : "Scan USB"}
          </button>
        </div>
        {devices.length === 0 ? (
          <p className="text-sm text-gray-500">
            Click "Scan USB" to detect RTL-SDR devices.
          </p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li key={d.index} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    d.available ? "bg-green-400" : "bg-red-500"
                  }`}
                />
                <span className="font-mono">#{d.index}</span>
                <span>{d.name}</span>
                {d.serial && (
                  <span className="text-gray-500 text-xs">S/N: {d.serial}</span>
                )}
                {!d.available && (
                  <span className="text-red-400 text-xs">(unavailable)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Profile form */}
      <div className="card">
        <h2 className="font-medium mb-4">
          {editId ? "Edit Profile" : "New Device Profile"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Profile name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Device index</label>
              <input
                type="number"
                className="input"
                value={form.device_index}
                onChange={(e) =>
                  setForm({ ...form, device_index: e.target.value })
                }
                min={0}
              />
            </div>
            <div>
              <label className="label">Gain (dB, blank = auto)</label>
              <input
                type="number"
                className="input"
                value={form.gain}
                onChange={(e) => setForm({ ...form, gain: e.target.value })}
                placeholder="auto"
                step="0.1"
              />
            </div>
            <div>
              <label className="label">Sample rate (Hz)</label>
              <input
                type="number"
                className="input"
                value={form.sample_rate}
                onChange={(e) =>
                  setForm({ ...form, sample_rate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">PPM correction</label>
              <input
                type="number"
                className="input"
                value={form.ppm_correction}
                onChange={(e) =>
                  setForm({ ...form, ppm_correction: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary">
              {editId ? "Save changes" : "Create profile"}
            </button>
            {editId && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setEditId(null);
                  setForm(EMPTY);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Saved profiles */}
      {profiles.length > 0 && (
        <div className="card">
          <h2 className="font-medium mb-3">Saved Profiles</h2>
          <ul className="space-y-2">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm border-b border-gray-800 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-400 ml-3">
                    Device #{p.device_index} · Gain:{" "}
                    {p.gain != null ? `${p.gain} dB` : "auto"} · PPM:{" "}
                    {p.ppm_correction}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => handleEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger text-xs"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
