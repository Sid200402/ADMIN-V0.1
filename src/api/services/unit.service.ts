import api from "../axiosInstance";

export const unitService = {
  getAll: (params: { limit: number; offset: number; keyword?: string; status?: string }) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    if (params.keyword) p.keyword = params.keyword;
    if (params.status)  p.status  = params.status;
    return api.get("/units", { params: p });
  },

  search: (keyword?: string) =>
    api.get("/units", { params: { limit: 50, offset: 0, status: "ACTIVE", ...(keyword ? { keyword } : {}) } })
      .then(r => r.data?.result || []),

  getStats: () =>
    api.get("/units/stats"),

  create: (body: { name: string; shortName: string }) =>
    api.post("/units", body),

  update: (id: string, body: { name: string; shortName: string }) =>
    api.patch(`/units/${id}`, body),

  updateStatus: (id: string, status: "ACTIVE" | "DEACTIVE") =>
    api.patch(`/units/status/${id}`, { status: String(status) }),

  delete: (id: string) =>
    api.delete(`/units/${id}`),
};
