import { http } from "@/lib/api";

const q = (o = {}) => {
  const out = {};
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "All") out[k] = v;
  });
  return out;
};

export const hrmsApi = {
  lookups: async () => (await http.get("/hrms/lookups")).data,
  settings: async () => (await http.get("/hrms/settings")).data,
  saveSettings: async (payload) => (await http.post("/hrms/settings", payload)).data,
  dashboard: async () => (await http.get("/hrms/dashboard")).data,
  seedDemo: async () => (await http.post("/hrms/seed/demo")).data,

  // Employees
  listEmployees: async (opts = {}) => (await http.get("/hrms/employees", { params: q(opts) })).data,
  getEmployee: async (id) => (await http.get(`/hrms/employees/${id}`)).data,
  createEmployee: async (payload) => (await http.post("/hrms/employees", payload)).data,
  updateEmployee: async (id, patch) => (await http.patch(`/hrms/employees/${id}`, patch)).data,
  deleteEmployee: async (id) => (await http.delete(`/hrms/employees/${id}`)).data,
  addDocument: async (id, payload) => (await http.post(`/hrms/employees/${id}/documents`, payload)).data,
  deleteDocument: async (id, docId) => (await http.delete(`/hrms/employees/${id}/documents/${docId}`)).data,

  // Attendance
  listAttendance: async (opts = {}) => (await http.get("/hrms/attendance", { params: q(opts) })).data,
  saveAttendance: async (payload) => (await http.post("/hrms/attendance", payload)).data,
  bulkAttendance: async (entries) => (await http.post("/hrms/attendance/bulk", { entries })).data,
  deleteAttendance: async (id) => (await http.delete(`/hrms/attendance/${id}`)).data,
  register: async (month) => (await http.get(`/hrms/attendance/register/${month}`)).data,

  // Leaves
  listLeaves: async (opts = {}) => (await http.get("/hrms/leaves", { params: q(opts) })).data,
  applyLeave: async (payload) => (await http.post("/hrms/leaves", payload)).data,
  decideLeave: async (id, status, approver = "HR") =>
    (await http.patch(`/hrms/leaves/${id}`, { status, approver })).data,
  balance: async (empId, year) =>
    (await http.get(`/hrms/leaves/balance/${empId}`, { params: q({ year }) })).data,

  // Payroll
  listPayroll: async (opts = {}) => (await http.get("/hrms/payroll", { params: q(opts) })).data,
  generatePayroll: async (payload) => (await http.post("/hrms/payroll/generate", payload)).data,
  paySummary: async (month) => (await http.get(`/hrms/payroll/summary/${month}`)).data,
  deleteMonthPayroll: async (month) => (await http.delete(`/hrms/payroll/${month}`)).data,

  // Payroll import
  payrollImportPreview: async (file, month) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("month", month);
    return (await http.post("/hrms/payroll/import/preview", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })).data;
  },
  payrollImportCommit: async (payload) => (await http.post("/hrms/payroll/import/commit", payload)).data,

  // Report export URLs
  urlEmployees: () => `${http.defaults.baseURL}/hrms/reports/employees/export`,
  urlAttendance: (start, end) => {
    const p = new URLSearchParams(q({ start, end })).toString();
    return `${http.defaults.baseURL}/hrms/reports/attendance/export${p ? `?${p}` : ""}`;
  },
  urlPayroll: (month) => `${http.defaults.baseURL}/hrms/reports/payroll/export?month=${month}`,
  urlPF: (month) => `${http.defaults.baseURL}/hrms/reports/pf/export?month=${month}`,
  urlESIC: (month) => `${http.defaults.baseURL}/hrms/reports/esic/export?month=${month}`,
};
