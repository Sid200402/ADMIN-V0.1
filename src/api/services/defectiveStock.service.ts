import api from "../axiosInstance";

export const defectiveStockService = {
  getPending: () =>
    api.get("/defective-product/pending"),

  approve: (id: string) =>
    api.put(`/defective-product/approve/${id}`),

  reject: (id: string) =>
    api.put(`/defective-product/reject/${id}`),

  getDefectiveStock: () =>
    api.get("/defective-product/defective-stock"),

  getVendorReturn: () =>
    api.get("/defective-product/vendor-return"),

  getVendorReturnHistory: () =>
    api.get("/defective-product/vendor-return-history"),

  getHistory: () =>
    api.get("/defective-product/history"),
};
