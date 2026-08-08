import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const ADMIN_TOKEN_KEY = "pps_admin_token";

export const adminHttp = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach bearer token from localStorage
adminHttp.interceptors.request.use((config) => {
  const t = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Global 401 handler — clear session
adminHttp.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem("pps_admin_user");
      if (!window.location.pathname.startsWith("/admin/login") &&
          window.location.pathname.startsWith("/admin")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const authApi = {
  login: async (email, password) => {
    const { data } = await adminHttp.post("/auth/login", { email, password });
    if (data.access_token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
      localStorage.setItem("pps_admin_user", JSON.stringify(data.user));
    }
    return data;
  },
  logout: async () => {
    try { await adminHttp.post("/auth/logout"); } catch {}
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem("pps_admin_user");
  },
  me: async () => (await adminHttp.get("/auth/me")).data,
  changePassword: async (current_password, new_password) =>
    (await adminHttp.post("/auth/change-password", { current_password, new_password })).data,
  getCachedUser: () => {
    try { return JSON.parse(localStorage.getItem("pps_admin_user") || "null"); }
    catch { return null; }
  },
  hasToken: () => !!localStorage.getItem(ADMIN_TOKEN_KEY),
};

export const adminApi = {
  dashboard: async () => (await adminHttp.get("/admin/dashboard")).data,

  listUsers: async (params = {}) =>
    (await adminHttp.get("/admin/users", { params })).data,
  createUser: async (payload) => (await adminHttp.post("/admin/users", payload)).data,
  getUser: async (id) => (await adminHttp.get(`/admin/users/${id}`)).data,
  updateUser: async (id, patch) => (await adminHttp.patch(`/admin/users/${id}`, patch)).data,
  resetUserPassword: async (id, new_password) =>
    (await adminHttp.post(`/admin/users/${id}/reset-password`, { new_password })).data,
  deleteUser: async (id) => (await adminHttp.delete(`/admin/users/${id}`)).data,

  listResources: async () => (await adminHttp.get("/admin/resources")).data,
  addResource: async (payload) => (await adminHttp.post("/admin/resources", payload)).data,
  updateResource: async (id, patch) => (await adminHttp.patch(`/admin/resources/${id}`, patch)).data,
  deleteResource: async (id) => (await adminHttp.delete(`/admin/resources/${id}`)).data,

  activity: async (params = {}) => (await adminHttp.get("/admin/activity", { params })).data,
  roleMeta: async () => (await adminHttp.get("/admin/settings/roles")).data,
};
