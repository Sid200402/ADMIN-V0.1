import api from "../axiosInstance";

export const taxRateService = {
  getAll: (params: { limit: number; offset: number; keyword?: string }) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    if (params.keyword) p.keyword = params.keyword;
    return api.get("/tax-rate", { params: p });
  },

  create: (body: { name: string; percentage: number }) =>
    api.post("/tax-rate", body),

  update: (id: string, body: { name: string; percentage: number }) =>
    api.patch(`/tax-rate/${id}`, body),

  delete: (id: string) =>
    api.delete(`/tax-rate/${id}`),
};
