import api from "./axiosInstance";
import type { Period, GraphGroup } from "../types";

export const getDashboardMain = (params: {
  period: Period;
  graphGroup: GraphGroup;
  storeId?: string;
  startDate?: string;
  endDate?: string;
}) => api.get("/dashboard/main", { params });

export const getAllStores = (params: {
  period: Period;
  startDate?: string;
  endDate?: string;
}) => api.get("/dashboard/all-stores", { params });

export const getDateWise = (params: {
  period: Period;
  storeId?: string;
  startDate?: string;
  endDate?: string;
}) => api.get("/dashboard/date-wise", { params });
