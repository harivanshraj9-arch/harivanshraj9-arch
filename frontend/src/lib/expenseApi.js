import { http } from "@/lib/api";

const params = (obj = {}) => {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "All") out[k] = v;
  });
  return out;
};

export const expenseApi = {
  categories: async () => (await http.get("/expenses/categories")).data,
  list: async (opts = {}) => (await http.get("/expenses", { params: params(opts) })).data,
  count: async (opts = {}) => (await http.get("/expenses/count", { params: params(opts) })).data,
  create: async (payload) => (await http.post("/expenses", payload)).data,
  update: async (id, patch) => (await http.patch(`/expenses/item/${id}`, patch)).data,
  remove: async (id) => (await http.delete(`/expenses/item/${id}`)).data,
  summary: async () => (await http.get("/expenses/summary/dashboard")).data,
  analyticsMonthly: async (months = 6) => (await http.get("/expenses/analytics/monthly", { params: { months } })).data,
  analyticsCategory: async (month) => (await http.get("/expenses/analytics/category", { params: params({ month }) })).data,
  analyticsWeekly: async (days = 14) => (await http.get("/expenses/analytics/weekly", { params: { days } })).data,
  analyticsPayment: async (month) => (await http.get("/expenses/analytics/payment", { params: params({ month }) })).data,
  getBudget: async (month) => (await http.get("/budget", { params: params({ month }) })).data,
  setBudget: async (amount, month) => (await http.post("/budget", { amount, month })).data,
  exportExcelUrl: (opts = {}) => {
    const p = new URLSearchParams(params(opts)).toString();
    return `${http.defaults.baseURL}/expenses/export/excel${p ? `?${p}` : ""}`;
  },
  backup: async () => (await http.get("/expenses/backup")).data,
  restore: async (payload) => (await http.post("/expenses/restore", payload)).data,
};
