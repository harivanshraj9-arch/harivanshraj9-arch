import { http } from "./api";

const q = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const discomApi = {
  divisions: async () => (await http.get("/discom/divisions")).data,
  stats: async () => (await http.get("/discom/stats")).data,

  ingestUrl: async (division, url, replace = true) =>
    (await http.post("/discom/ingest/url", { division, url, replace })).data,

  ingestUpload: async (division, file, replace = true) => {
    const fd = new FormData();
    fd.append("division", division);
    fd.append("replace", String(replace));
    fd.append("file", file);
    const { data } = await http.post("/discom/ingest/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 0,
    });
    return data;
  },

  job: async (id) => (await http.get(`/discom/jobs/${id}`)).data,
  jobs: async (division) => (await http.get("/discom/jobs", { params: q({ division }) })).data,

  listConsumers: async (params) =>
    (await http.get("/discom/consumers", { params: q(params) })).data,

  getConsumer: async (id) => (await http.get(`/discom/consumers/${id}`)).data,

  clearDivision: async (division) => (await http.delete(`/discom/division/${division}`)).data,
};

// Preloaded artifact URLs — user uploaded these in this session
export const DISCOM_ARTIFACT_URLS = {
  "SITAPUR-I": "https://customer-assets-rejwkqb3.emergentagent.net/job_executive-board-3/artifacts/73pxno88_SITAPUR%20DIV%20I.gz",
  "SITAPUR-II": "https://customer-assets-rejwkqb3.emergentagent.net/job_executive-board-3/artifacts/4z8gfbr1_SITAPUR%20DIV%20II.gz",
  "BISWAN-III": "https://customer-assets-rejwkqb3.emergentagent.net/job_executive-board-3/artifacts/etqtn170_BISWAN%20DIV%20III.gz",
  "MAHMUDABAD-IV": "https://customer-assets-rejwkqb3.emergentagent.net/job_executive-board-3/artifacts/avhso568_MAHMOODABAD%20%20DIV%20IV.gz",
};

export const CONSUMER_INQUIRY_URL = "https://consumer.uppcl.org/wss/pay_bill_home";
