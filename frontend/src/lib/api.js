import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const fetchResources = async ({ category, q } = {}) => {
  const params = {};
  if (category && category !== "All") params.category = category;
  if (q) params.q = q;
  const { data } = await http.get("/resources", { params });
  return data;
};

export const fetchStats = async () => {
  const { data } = await http.get("/stats");
  return data;
};

export const fetchActivity = async (limit = 8) => {
  const { data } = await http.get("/activity", { params: { limit } });
  return data;
};

export const logActivity = async (resource_id, action = "opened") => {
  const { data } = await http.post("/activity", { resource_id, action });
  return data;
};

export const toggleStar = async (id, starred) => {
  const { data } = await http.patch(`/resources/${id}`, { starred });
  return data;
};
