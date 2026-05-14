import api from "../axiosInstance";

export const modelService = {
  getAll: (params: { limit: number; offset: number; keyword?: string; status?: string }) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    if (params.keyword) p.keyword = params.keyword;
    if (params.status)  p.status  = params.status;
    return api.get("/model/all", { params: p });
  },

  search: (keyword?: string) =>
    api.get("/model/all", { params: { limit: 50, offset: 0, status: "ACTIVE", ...(keyword ? { keyword } : {}) } })
      .then(r => r.data?.result || []),

  getStats: () =>
    api.get("/model/stats"),

  create: (body: { name: string }) =>
    api.post("/model", body),

  update: (id: string, body: { name: string }) =>
    api.patch(`/model/${id}`, body),

  updateStatus: (id: string, status: "ACTIVE" | "DEACTIVE") =>
    api.patch(`/model/status/${id}`, { status: String(status) }),

  delete: (id: string) =>
    api.delete(`/model/delete/${id}`),
};
