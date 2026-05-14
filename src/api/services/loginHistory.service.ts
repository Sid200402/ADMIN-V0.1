import api from "../axiosInstance";

export const loginHistoryService = {
  getAll: (params?: { keyword?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number }) =>
    api.get("/login-history", { params }),

  getByStaff: (accountId: string, params?: { keyword?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number }) =>
    api.get(`/login-history/staff/${accountId}`, { params }),
};
