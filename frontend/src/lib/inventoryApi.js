import { adminHttp } from "./adminApi";

const q = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const inventoryApi = {
  dashboard: async () => (await adminHttp.get("/inventory/dashboard")).data,

  // masters
  listMasters: async (type) => (await adminHttp.get("/inventory/masters", { params: q({ type }) })).data,
  addMaster: async (payload) => (await adminHttp.post("/inventory/masters", payload)).data,
  updateMaster: async (id, patch) => (await adminHttp.patch(`/inventory/masters/${id}`, patch)).data,
  deleteMaster: async (id) => (await adminHttp.delete(`/inventory/masters/${id}`)).data,
  importMasters: async (type, file) => {
    const fd = new FormData(); fd.append("file", file);
    return (await adminHttp.post(`/inventory/import/masters?type=${type}`, fd,
      { headers: { "Content-Type": "multipart/form-data" } })).data;
  },

  // smart meters
  listSmart: async (params = {}) => (await adminHttp.get("/inventory/smart-meters", { params: q(params) })).data,
  getSmart: async (id) => (await adminHttp.get(`/inventory/smart-meters/${id}`)).data,
  addSmart: async (payload) => (await adminHttp.post("/inventory/smart-meters", payload)).data,
  updateSmart: async (id, patch) => (await adminHttp.patch(`/inventory/smart-meters/${id}`, patch)).data,
  deleteSmart: async (id) => (await adminHttp.delete(`/inventory/smart-meters/${id}`)).data,
  importSmart: async (file) => {
    const fd = new FormData(); fd.append("file", file);
    return (await adminHttp.post("/inventory/import/smart-meters", fd,
      { headers: { "Content-Type": "multipart/form-data" } })).data;
  },

  // old meters
  listOld: async (params = {}) => (await adminHttp.get("/inventory/old-meters", { params: q(params) })).data,
  addOld: async (payload) => (await adminHttp.post("/inventory/old-meters", payload)).data,
  updateOld: async (id, patch) => (await adminHttp.patch(`/inventory/old-meters/${id}`, patch)).data,
  deleteOld: async (id) => (await adminHttp.delete(`/inventory/old-meters/${id}`)).data,
  importOld: async (file) => {
    const fd = new FormData(); fd.append("file", file);
    return (await adminHttp.post("/inventory/import/old-meters", fd,
      { headers: { "Content-Type": "multipart/form-data" } })).data;
  },

  // cables
  listCables: async (params = {}) => (await adminHttp.get("/inventory/cables", { params: q(params) })).data,
  addCable: async (payload) => (await adminHttp.post("/inventory/cables", payload)).data,
  updateCable: async (id, patch) => (await adminHttp.patch(`/inventory/cables/${id}`, patch)).data,
  deleteCable: async (id) => (await adminHttp.delete(`/inventory/cables/${id}`)).data,
  importCables: async (file) => {
    const fd = new FormData(); fd.append("file", file);
    return (await adminHttp.post("/inventory/import/cables", fd,
      { headers: { "Content-Type": "multipart/form-data" } })).data;
  },

  ledger: async (params = {}) => (await adminHttp.get("/inventory/ledger", { params: q(params) })).data,
  reportsSummary: async () => (await adminHttp.get("/inventory/reports/summary")).data,
  reportXlsxUrl: (kind) => `/inventory/reports/${kind}.xlsx`,

  // Session B
  listInstallations: async (params = {}) => (await adminHttp.get("/inventory/installations", { params: q(params) })).data,
  addInstallation: async (payload) => (await adminHttp.post("/inventory/installations", payload)).data,

  listGatePasses: async (params = {}) => (await adminHttp.get("/inventory/gate-passes", { params: q(params) })).data,
  addGatePass: async (payload) => (await adminHttp.post("/inventory/gate-passes", payload)).data,
  updateGatePass: async (id, patch) => (await adminHttp.patch(`/inventory/gate-passes/${id}`, patch)).data,

  listCableIssues: async (params = {}) => (await adminHttp.get("/inventory/cable-issues", { params: q(params) })).data,
  addCableIssue: async (payload) => (await adminHttp.post("/inventory/cable-issues", payload)).data,

  listBISignoffs: async (params = {}) => (await adminHttp.get("/inventory/bisignoffs", { params: q(params) })).data,
  addBISignoff: async (payload) => (await adminHttp.post("/inventory/bisignoffs", payload)).data,
  updateBISignoff: async (id, patch) => (await adminHttp.patch(`/inventory/bisignoffs/${id}`, patch)).data,

  crossHistory: async (serial) => (await adminHttp.get(`/inventory/history/serial/${encodeURIComponent(serial)}`)).data,
};

export const MASTER_TYPES = [
  { key: "division", label: "Division" },
  { key: "sub_division", label: "Sub Division" },
  { key: "sdo", label: "SDO" },
  { key: "store", label: "Store" },
  { key: "agency", label: "Agency / Vendor" },
  { key: "installer", label: "Installer" },
  { key: "meter_make", label: "Meter Make" },
  { key: "meter_model", label: "Meter Model" },
  { key: "cable_type", label: "Cable Type" },
  { key: "cable_size", label: "Cable Size" },
  { key: "document_type", label: "Document Type" },
];

export const SM_STATUSES = ["Available", "Issued", "Installed", "Returned", "Damaged", "Defective"];
export const OM_CONDITIONS = ["Good", "Repairable", "Damaged", "Burnt", "Defective", "Scrap"];
export const OM_DEPOSITS = ["Pending", "Deposited", "Verified"];
