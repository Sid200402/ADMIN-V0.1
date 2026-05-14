import api from "../axiosInstance";

export const customerService = {
  // Admin list with full filters
  getAdminList: (params?: {
    keyword?: string;
    storeId?: string;
    priceGroupId?: string;
    isOnWhatsapp?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => api.get("/customer/admin/list", { params }),

  getById: (id: string) =>
    api.get(`/customer/${id}`),

  create: (body: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    storeId: string;
    priceGroupId?: string;
  }) => api.post("/customer", body),

  update: (id: string, body: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    priceGroupId: string;
  }>) => api.patch(`/customer/${id}`, body),

  updateWhatsapp: (id: string, isOnWhatsapp: boolean) =>
    api.patch(`/customer/${id}/whatsapp`, { isOnWhatsapp }),

  updateDue: (customerId: string, amount: number) =>
    api.patch("/customer/update-due", { customerId, amount }),

  delete: (id: string) =>
    api.delete(`/customer/${id}`),

  getDuesList: (storeId?: string) =>
    api.get("/customer/dues/list", { params: { storeId } }),

  getDuesById: (id: string) =>
    api.get(`/customer/dues/${id}`),

  downloadInvoice: (storeId: string, customerId: string) =>
    api.get("/customer/due/invoice", { params: { storeId, customerId }, responseType: "blob" }),

  // Admin inquiries
  getInquiries: (status?: string) =>
    api.get("/customer/admin/inquiries", { params: { status } }),

  updateInquiry: (id: string, body: { status?: string; reply?: string }) =>
    api.patch(`/customer/admin/inquiries/${id}`, body),
};
