import api from "../axiosInstance";

export const categoryService = {
  getAll: (params: { limit: number; offset: number; keyword?: string; status?: string }) => {
    const p: Record<string, any> = { limit: params.limit, offset: params.offset };
    if (params.keyword) p.keyword = params.keyword;
    if (params.status)  p.status  = params.status;
    return api.get("/category/all", { params: p });
  },

  search: (keyword?: string) =>
    api.get("/category/all", { params: { limit: 50, offset: 0, status: "ACTIVE", ...(keyword ? { keyword } : {}) } })
      .then(r => r.data?.result || []),

  getStats: () =>
    api.get("/category/stats"),

  create: (body: Record<string, any>) =>
    api.post("/category", body),

  update: (id: string, body: Record<string, any>) =>
    api.patch(`/category/${id}`, body),

  updateStatus: (id: string, status: "ACTIVE" | "DEACTIVE") =>
    api.patch(`/category/status/${id}`, { status: String(status) }),

  delete: (id: string) =>
    api.delete(`/category/${id}`),

  uploadImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.put(`/category/image/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },

  uploadCrazyImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.put(`/category/crzyimage/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};
