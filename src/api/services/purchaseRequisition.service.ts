import api from "../axiosInstance";

export const purchaseRequisitionService = {
  getList: (params: {
    storeId: string;
    categoryId?: string;
    brandId?: string;
    masterBrandId?: string;
    status?: string;
    stockStatus?: string;
    limit?: number;
    offset?: number;
  }) => api.get("/purchase-requisition/list", { params }),

  getById: (id: string) =>
    api.get(`/purchase-requisition/${id}`),

  markPurchased: (id: string, body: { purchasedQuantity: number; pricePerUnit: number; notes?: string }) =>
    api.post(`/purchase-requisition/${id}/mark-purchased`, body),

  remove: (id: string, reason: string) =>
    api.post(`/purchase-requisition/${id}/remove`, { reason }),

  reportPurchased: (params: { storeId: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) =>
    api.get("/purchase-requisition/report/purchased", { params }),
};
