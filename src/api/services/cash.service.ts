import api from "../axiosInstance";

export const cashService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboardStats: (date: string) =>
    api.get("/cash-drawer/dashboard-stats", { params: { date } }),

  // ── Drawers ────────────────────────────────────────────────────────────────
  getAllDrawers: (params: {
    limit: number; offset: number;
    status?: string; storeId?: string;
    startDate?: string; endDate?: string; cashierName?: string;
  }) => {
    const p: Record<string, string> = {
      limit: String(params.limit),
      offset: String(params.offset),
    };
    if (params.status)      p.status      = params.status;
    if (params.storeId)     p.storeId     = params.storeId;
    if (params.startDate)   p.startDate   = params.startDate;
    if (params.endDate)     p.endDate     = params.endDate;
    if (params.cashierName) p.cashierName = params.cashierName;
    return api.get("/cash-drawer/all", { params: p });
  },

  getAvailableCashiers: (storeId?: string) =>
    api.get("/cash-drawer/admin/available-cashiers", { params: storeId ? { storeId } : {} }),

  openDrawer: (body: { cashierId: string; storeId: string; openingAmount: number; note?: string }) =>
    api.post("/cash-drawer/admin/open-drawer", body),

  getDrawerSummary: (id: string) =>
    api.get(`/cash-drawer/${id}/summary`),

  closeDrawer: (id: string, body: { actualCountedAmount: number; note?: string }) =>
    api.put(`/cash-drawer/close/${id}`, body),

  addCash: (body: { cashDrawerId: string; amount: number; description: string }) =>
    api.post("/cash-drawer/add-cash", body),

  getTransactions: (params: { drawerId: string; limit: number; offset: number; type?: string }) =>
    api.get("/cash-drawer/transactions", { params }),

  getTransferHistory: (params: { limit: number; offset: number; drawerId?: string }) =>
    api.get("/cash-drawer/transfer-history", { params }),

  // ── Cash-Out ───────────────────────────────────────────────────────────────
  getPendingCashOut: (params: { limit?: number; offset?: number; storeId?: string }) =>
    api.get("/cash-drawer/pending-cash-out-requests", { params }),

  getCashOutHistory: (params: { limit: number; offset: number; storeId?: string }) =>
    api.get("/cash-drawer/cash-out-history", { params }),

  approveCashOut: (id: string, note?: string) =>
    api.put(`/cash-drawer/approve-cash-out/${id}`, { note }),

  rejectCashOut: (id: string, reason: string) =>
    api.put(`/cash-drawer/reject-cash-out/${id}`, { reason }),

  // ── Transfers ──────────────────────────────────────────────────────────────
  transferCash: (body: { fromDrawerId: string; toDrawerId: string; amount: number; description: string }) =>
    api.post("/cash-drawer/transfer", body),

  // ── Bank ───────────────────────────────────────────────────────────────────
  getBankAccount: (storeId: string) =>
    api.get("/cash-drawer/bank/account", { params: { storeId } }),

  saveBankAccount: (body: {
    storeId: string; accountName: string; accountNumber: string;
    bankName: string; ifscCode: string; branchName?: string; notes?: string;
  }) => api.post("/cash-drawer/bank/account", body),

  bankTransfer: (body: { fromStoreId: string; toStoreId: string; amount: number; description: string }) =>
    api.post("/cash-drawer/bank/transfer", body),

  requestBankWithdrawal: (body: { storeId: string; amount: number; reason: string }) =>
    api.post("/cash-drawer/bank/withdrawal/request", body),

  getPendingWithdrawals: (storeId: string) =>
    api.get("/cash-drawer/bank/withdrawal/pending", { params: { storeId } }),

  approveWithdrawal: (id: string, note?: string) =>
    api.put(`/cash-drawer/bank/withdrawal/approve/${id}`, { note }),

  rejectWithdrawal: (id: string, reason: string) =>
    api.put(`/cash-drawer/bank/withdrawal/reject/${id}`, { reason }),

  getBankTransactions: (params: { storeId: string; limit: number; offset: number; startDate?: string; endDate?: string }) =>
    api.get("/cash-drawer/bank/transactions", { params }),

  // ── Reports ────────────────────────────────────────────────────────────────
  getStoreWiseSummary: (date: string, storeId?: string) =>
    api.get("/cash-drawer/store-wise-summary", { params: { date, ...(storeId ? { storeId } : {}) } }),

  getDrawerHistory: (params: { limit: number; offset: number; startDate?: string; endDate?: string }) =>
    api.get("/cash-drawer/history", { params }),

  getAllStoresStatus: () =>
    api.get("/cash-drawer/all-stores-status"),
};
