import api from "../axiosInstance";

export const expenseService = {
  create: (body: {
    title: string;
    description?: string;
    amount: number;
    expenseDate: string;
    storeId?: string;
  }) => api.post("/expense", body),

  getAll: (params?: {
    status?: string;
    storeId?: string;
    accountId?: string;
    keyword?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }) => api.get("/expense", { params }),

  export: (storeId?: string) =>
    api.get("/expense/export", { params: { storeId }, responseType: "blob" }),

  getById: (id: string) =>
    api.get(`/expense/${id}`),

  update: (id: string, body: Partial<{
    title: string;
    description: string;
    amount: number;
    expenseDate: string;
  }>) => api.patch(`/expense/${id}`, body),

  delete: (id: string) =>
    api.delete(`/expense/${id}`),

  accept: (id: string, note?: string) =>
    api.put(`/expense/${id}/accept`, { note }),

  reject: (id: string, reason: string) =>
    api.put(`/expense/${id}/reject`, { reason }),
};
