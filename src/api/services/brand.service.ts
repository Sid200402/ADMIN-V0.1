import api from "../axiosInstance";

export const brandService = {
  getAll: (params: { limit: number; offset: number; keyword?: string; status?: string }) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    if (params.keyword) p.keyword = params.keyword;
    if (params.status)  p.status  = params.status;
    return api.get("/brands/all", { params: p });
  },

  search: (keyword?: string) =>
    api.get("/brands/all", { params: { limit: 50, offset: 0, status: "ACTIVE", ...(keyword ? { keyword } : {}) } })
      .then(r => r.data?.result || []),

  getStats: () =>
    api.get("/brands/stats"),

  create: (body: { name: string }) =>
    api.post("/brands", body),

  update: (id: string, body: { name: string }) =>
    api.patch(`/brands/${id}`, body),

  updateStatus: (id: string, status: "ACTIVE" | "DEACTIVE") =>
    api.patch(`/brands/status/${id}`, { status: String(status) }),

  delete: (id: string) =>
    api.delete(`/brands/${id}`),
};
