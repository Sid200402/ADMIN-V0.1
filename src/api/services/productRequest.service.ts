import api from "../axiosInstance";

export const productRequestService = {
  getList: (params?: { categoryId?: string; status?: string; limit?: number; offset?: number }) =>
    api.get("/product-request/admin/list", { params }),

  getCategoryWise: (params?: { status?: string }) =>
    api.get("/product-request/admin/category-wise", { params }),

  downloadCategoryWise: (params?: { status?: string }) =>
    api.get("/product-request/admin/download/category-wise", { params, responseType: "blob" }),

  getById: (id: string) =>
    api.get(`/product-request/${id}`),

  updateStatus: (id: string, status: string) =>
    api.post(`/product-request/${id}/status`, { status }),

  delete: (id: string) =>
    api.delete(`/product-request/${id}`),
};
