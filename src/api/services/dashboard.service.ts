import api from "../axiosInstance";
import type { Period } from "../../types";

const graphGroupByPeriod: Record<string, string> = {
  daily: "day", weekly: "day", "last-7-days": "day",
  "this-month": "day", yearly: "month", custom: "day",
};

export const dashboardService = {
  getMain: (params: {
    period: Period;
    storeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const p: Record<string, string> = {
      period: params.period,
      graphGroup: graphGroupByPeriod[params.period] || "day",
    };
    if (params.storeId)   p.storeId   = params.storeId;
    if (params.startDate) p.startDate = params.startDate;
    if (params.endDate)   p.endDate   = params.endDate;
    return api.get("/dashboard/main", { params: p });
  },

  getAllStores: (params: {
    period: Period;
    startDate?: string;
    endDate?: string;
  }) => {
    const p: Record<string, string> = { period: params.period };
    if (params.startDate) p.startDate = params.startDate;
    if (params.endDate)   p.endDate   = params.endDate;
    return api.get("/dashboard/all-stores", { params: p });
  },

  getDateWise: (params: {
    period: Period;
    storeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const p: Record<string, string> = { period: params.period };
    if (params.storeId)   p.storeId   = params.storeId;
    if (params.startDate) p.startDate = params.startDate;
    if (params.endDate)   p.endDate   = params.endDate;
    return api.get("/dashboard/date-wise", { params: p });
  },
};
