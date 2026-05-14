import api from "../axiosInstance";

export const reportService = {
  getSalesByDateRange: (params: { storeId?: string; startDate?: string; endDate?: string; status?: string }) =>
    api.get("/report/sales/date-range", { params }),

  getDailySales: (params: { date: string; storeId?: string; status?: string }) =>
    api.get("/report/sales/daily", { params }),

  getSevenDaySales: (params: { selectedDate: string; storeId?: string; status?: string }) =>
    api.get("/report/sales/seven-days", { params }),

  exportDateRange: (params: { storeId?: string; startDate?: string; endDate?: string; status?: string }) =>
    api.get("/report/export/sales/date-range", { params, responseType: "blob" }),

  exportDaily: (params: { date: string; storeId?: string; status?: string }) =>
    api.get("/report/export/sales/daily", { params, responseType: "blob" }),

  exportSevenDays: (params: { selectedDate: string; storeId?: string; status?: string }) =>
    api.get("/report/export/sales/seven-days", { params, responseType: "blob" }),
};
