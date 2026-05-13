import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// ── Devices ─────────────────────────────────────────────────────────────────
export const scanDevices = () => api.get("/devices/scan").then((r) => r.data);
export const getProfiles = () => api.get("/devices/profiles").then((r) => r.data);
export const createProfile = (data) =>
  api.post("/devices/profiles", data).then((r) => r.data);
export const updateProfile = (id, data) =>
  api.put(`/devices/profiles/${id}`, data).then((r) => r.data);
export const deleteProfile = (id) =>
  api.delete(`/devices/profiles/${id}`).then((r) => r.data);

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const getJobs = () => api.get("/jobs").then((r) => r.data);
export const getJob = (id) => api.get(`/jobs/${id}`).then((r) => r.data);
export const createJob = (data) => api.post("/jobs", data).then((r) => r.data);
export const updateJob = (id, data) =>
  api.put(`/jobs/${id}`, data).then((r) => r.data);
export const deleteJob = (id) =>
  api.delete(`/jobs/${id}`).then((r) => r.data);
export const startJob = (id) =>
  api.post(`/jobs/${id}/start`).then((r) => r.data);
export const stopJob = (id) =>
  api.post(`/jobs/${id}/stop`).then((r) => r.data);

// ── Spectrum data ─────────────────────────────────────────────────────────────
export const getReadings = (jobId, params = {}) =>
  api.get(`/data/jobs/${jobId}/readings`, { params }).then((r) => r.data);
export const getTimestamps = (jobId) =>
  api.get(`/data/jobs/${jobId}/timestamps`).then((r) => r.data);
export const downloadUrl = (jobId, format = "csv") =>
  `/api/data/jobs/${jobId}/download?format=${format}`;

// ── AI Analysis ───────────────────────────────────────────────────────────────
export const getTemplates = () =>
  api.get("/analysis/templates").then((r) => r.data);
export const submitAnalysis = (data) =>
  api.post("/analysis", data).then((r) => r.data);
export const getAnalysis = (id) =>
  api.get(`/analysis/${id}`).then((r) => r.data);
export const listJobAnalyses = (jobId) =>
  api.get(`/analysis/job/${jobId}`).then((r) => r.data);
