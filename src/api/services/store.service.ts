import api from "../axiosInstance";

export const storeService = {
  getAll: (params?: { limit?: number; offset?: number; keyword?: string; status?: string }) =>
    api.get("/store", {
      params: {
        limit:  params?.limit  ?? 100,
        offset: params?.offset ?? 0,
        ...(params?.keyword ? { keyword: params.keyword } : {}),
        ...(params?.status  ? { status:  params.status  } : {}),
      },
    }),

  search: (keyword?: string) =>
    api.get("/store", { params: { limit: 50, offset: 0, status: "ACTIVE", ...(keyword ? { keyword } : {}) } })
      .then(r => r.data?.result || []),

  getStats: () =>
    api.get("/store/stats"),

  getById: (id: string) =>
    api.get(`/store/${id}`),

  create: (body: { name: string; storeCode: string; address?: string; phone?: string; email?: string }) =>
    api.post("/store", body),

  update: (id: string, body: Partial<{ name: string; storeCode: string; address: string; phone: string; email: string }>) =>
    api.patch(`/store/${id}`, body),

  updateStatus: (id: string, status: string) =>
    api.patch(`/store/status/${id}`, { status }),

  setDefault: (id: string) =>
    api.patch(`/store/default/${id}`, { defaultStore: true }),

  delete: (id: string) =>
    api.delete(`/store/${id}`),
};
