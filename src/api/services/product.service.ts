import api from "../axiosInstance";

export const productService = {
  getAll: (params: Record<string, any>) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    ["keyword", "status", "categoryId", "brandId", "masterBrandId",
      "priceGroupId", "unitId", "modelId", "warrantyStatus", "accountId"]
      .forEach(k => { if (params[k]) p[k] = params[k]; });
    return api.get("/product/admin", { params: p });
  },

  getStats: () => api.get("/product/stats"),

  create: (body: Record<string, any>) => api.post("/product", body),

  update: (id: string, body: Record<string, any>) => api.patch(`/product/${id}`, body),

  updateStatus: (id: string, status: string) =>
    api.patch(`/product/status/${id}`, { status }),

  updateQuantity: (id: string, quantity: number) =>
    api.patch(`/product/quantity/${id}`, { quantity }),

  uploadImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.put(`/product/uploadImage/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },

  delete: (id: string) => api.delete(`/product/${id}`),

  exportExcel: (params?: Record<string, any>) =>
    api.get("/product/export", { params: params || {}, responseType: "blob" }),

  downloadPdf: (params?: Record<string, any>) =>
    api.get("/product/pdf/product-list", { params: params || {}, responseType: "blob" }),

  downloadHistoryPdf: (startDate: string, endDate: string) =>
    api.get("/product/pdf/creation-history", { params: { startDate, endDate }, responseType: "blob" }),

  downloadCategoryBrandPdf: () =>
    api.get("/product/pdf/category-brand-list", { responseType: "blob" }),
};

export const barcodeService = {
  generate: (productId: string) =>
    api.post("/barcode/generate", { productId }),

  print: (body: { productId: string; quantity: number; labelSize: string; layoutColumns?: number }) =>
    api.post("/barcode/print", body),

  scan: (barcode: string) =>
    api.post("/barcode/scan", { barcode }),
};

export const inventoryService = {
  getAll: (params: Record<string, any>) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    ["keyword", "storeId", "productId", "categoryId", "brandId",
      "masterBrandId", "priceGroupId", "stockStatus", "warrantyStatus"]
      .forEach(k => { if (params[k]) p[k] = params[k]; });
    return api.get("/inventory", { params: p });
  },

  getDashboard: () => api.get("/inventory/stats"),

  purchaseStock: (body: Record<string, any>) =>
    api.post("/inventory/purchase", body),

  adjustStock: (body: Record<string, any>) =>
    api.put("/inventory/adjust", body),

  transferStock: (body: Record<string, any>) =>
    api.post("/inventory/transfer", body),

  getBatches: (productId: string, storeId: string) =>
    api.get(`/batch/product/${productId}/store/${storeId}`),

  createLegacyBatch: (productId: string, storeId: string) =>
    api.post("/batch/legacy", { productId, storeId }),

  exportExcel: (params?: Record<string, any>) =>
    api.get("/product/export", { params: params || {}, responseType: "blob" }),

  exportInventoryPdf: (params?: Record<string, any>) =>
    api.get("/product/pdf/product-list", { params: params || {}, responseType: "blob" }),

  exportCategoryBrandPdf: (params?: Record<string, any>) =>
    api.get("/product/pdf/category-brand-list", { params: params || {}, responseType: "blob" }),

  exportPurchaseHistoryPdf: (params?: Record<string, any>) =>
    api.get("/inventory/purchase-history/pdf", { params: params || {}, responseType: "blob" }),

  exportTransferHistoryPdf: (params?: Record<string, any>) =>
    api.get("/inventory/transfer-history/pdf", { params: params || {}, responseType: "blob" }),

  exportCreationHistoryPdf: (startDate: string, endDate: string) =>
    api.get("/product/pdf/creation-history", { params: { startDate, endDate }, responseType: "blob" }),
};
