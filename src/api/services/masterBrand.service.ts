import api from "../axiosInstance";

export const masterBrandService = {
  getAll: (params: { limit: number; offset: number; keyword?: string; status?: string }) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    if (params.keyword) p.keyword = params.keyword;
    if (params.status)  p.status  = params.status;
    return api.get("/master-brands/all", { params: p });
  },

  search: (keyword?: string) =>
    api.get("/master-brands/all", { params: { limit: 50, offset: 0, status: "ACTIVE", ...(keyword ? { keyword } : {}) } })
      .then(r => r.data?.result || []),

  getStats: () =>
    api.get("/master-brands/stats"),

  create: (body: { name: string }) =>
    api.post("/master-brands", body),

  update: (id: string, body: { name: string }) =>
    api.patch(`/master-brands/${id}`, body),

  updateStatus: (id: string, status: "ACTIVE" | "DEACTIVE") =>
    api.put(`/master-brands/status/${id}`, { status: String(status) }),

  delete: (id: string) =>
    api.delete(`/master-brands/${id}`),
};
