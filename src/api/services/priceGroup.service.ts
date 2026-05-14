import api from "../axiosInstance";

export const priceGroupService = {
  getAll: (params: { limit: number; offset: number; keyword?: string; status?: string }) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    if (params.keyword) p.keyword = params.keyword;
    if (params.status)  p.status  = params.status;
    return api.get("/price-group", { params: p });
  },

  getActive: () =>
    api.get("/price-group/active"),

  create: (body: { name: string; serialNo?: number }) =>
    api.post("/price-group", body),

  update: (id: string, body: { name: string; serialNo?: number }) =>
    api.patch(`/price-group/${id}`, body),

  updateStatus: (id: string, status: "ACTIVE" | "DEACTIVE") =>
    api.patch(`/price-group/status/${id}`, { status: String(status) }),

  delete: (id: string) =>
    api.delete(`/price-group/${id}`),
};
