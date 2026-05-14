import api from "../axiosInstance";

export const notificationService = {
  create: (body: { title: string; desc: string; accountId?: string; type?: string }) =>
    api.post("/notifications/create", body),

  getAll: (params?: { limit?: number; offset?: number }) =>
    api.get("/notifications/admin", { params }),

  getUnreadCount: () =>
    api.get("/notifications/unread-count"),

  markRead: (id: string | number) =>
    api.patch(`/notifications/mark-read/${id}`),

  markAllRead: () =>
    api.patch("/notifications/mark-all-read"),

  clearAll: () =>
    api.delete("/notifications/clear-all"),

  getLowStock: (storeId: string) =>
    api.get(`/notifications/low-stock/${storeId}`),
};
