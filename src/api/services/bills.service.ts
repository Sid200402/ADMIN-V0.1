import api from "../axiosInstance";

export interface BillsParams {
  limit: number;
  offset: number;
  keyword?: string;
  status?: string;
  date?: string;
}

export const billsService = {
  getAll: (params: BillsParams) => {
    const p: Record<string, string> = {
      limit:  String(params.limit),
      offset: String(params.offset),
    };
    if (params.keyword) p.keyword = params.keyword;
    if (params.status)  p.status  = params.status;
    if (params.date)    p.date    = params.date;
    return api.get("/bill", { params: p });
  },

  getById: (id: string) =>
    api.get(`/bill/${id}`),
};
