import { http } from "@/lib/api";
const q = (o={}) => { const r={}; Object.entries(o).forEach(([k,v]) => { if (v!==undefined && v!==null && v!=="" && v!=="All") r[k]=v; }); return r; };

export const billingApi = {
  listRates: async (opts={}) => (await http.get("/billing/rates", { params: q(opts) })).data,
  createRate: async (p) => (await http.post("/billing/rates", p)).data,
  updateRate: async (id, p) => (await http.patch(`/billing/rates/${id}`, p)).data,
  deleteRate: async (id) => (await http.delete(`/billing/rates/${id}`)).data,
  toggleRate: async (id) => (await http.post(`/billing/rates/${id}/toggle`)).data,
  rateHistory: async (id) => (await http.get(`/billing/rates/${id}/history`)).data,
  audit: async () => (await http.get("/billing/rates/audit")).data,
  categories: async () => (await http.get("/billing/rates/categories")).data,
  exportRatesUrl: () => `${http.defaults.baseURL}/billing/rates/export`,
  importRates: async (file) => {
    const fd = new FormData(); fd.append("file", file);
    return (await http.post("/billing/rates/import", fd, { headers: { "Content-Type": "multipart/form-data" }})).data;
  },
  parseWCC: async (file) => {
    const fd = new FormData(); fd.append("file", file);
    return (await http.post("/billing/wcc/parse", fd, { headers: { "Content-Type": "multipart/form-data" }})).data;
  },
  createInvoice: async (p) => (await http.post("/billing/invoices", p)).data,
  listInvoices: async (opts={}) => (await http.get("/billing/invoices", { params: q(opts) })).data,
  getInvoice: async (id) => (await http.get(`/billing/invoices/${id}`)).data,
  deleteInvoice: async (id) => (await http.delete(`/billing/invoices/${id}`)).data,
  invoiceExcelUrl: (id) => `${http.defaults.baseURL}/billing/invoices/${id}/export`,
  invoicePdfUrl: (id) => `${http.defaults.baseURL}/billing/invoices/${id}/pdf`,
  updatePayment: async (id, payload) => (await http.patch(`/billing/invoices/${id}/payment`, payload)).data,
  summary: async () => (await http.get("/billing/dashboard/summary")).data,
  getCompany: async () => (await http.get("/billing/company")).data,
  saveCompany: async (p) => (await http.post("/billing/company", p)).data,
  addPayment: async (id, p) => (await http.post(`/billing/invoices/${id}/payments`, p)).data,
  listPayments: async (id) => (await http.get(`/billing/invoices/${id}/payments`)).data,
  deletePayment: async (pid) => (await http.delete(`/billing/payments/${pid}`)).data,
  statement: async (customer, start, end) => (await http.get("/billing/statement", { params: q({ customer, start, end }) })).data,

  // ---- Historical Excel Import ----
  historicalPreview: async (file) => {
    const fd = new FormData(); fd.append("file", file);
    return (await http.post("/billing/historical/preview", fd, {
      headers: { "Content-Type": "multipart/form-data" }, timeout: 120000,
    })).data;
  },
  historicalCommit: async (payload) => (await http.post("/billing/historical/commit", payload)).data,
  historicalHistory: async () => (await http.get("/billing/historical/history")).data,
  historicalTemplateUrl: () => `${http.defaults.baseURL}/billing/historical/template`,
};
