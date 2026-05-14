import api from "../axiosInstance";

export const bannersService = {
  // ── Banner ──────────────────────────────────────────────────────────────
  createBanner:       (body: any)            => api.post("/banner",                  body),
  getBanners:         ()                     => api.get("/banner/admin/list"),
  getBannerById:      (id: string)           => api.get(`/banner/admin/${id}`),
  updateBanner:       (id: string, body: any)=> api.put(`/banner/${id}`,             body),
  deleteBanner:       (id: string)           => api.delete(`/banner/${id}`),
  uploadBannerImage:  (id: string, file: File) => {
    const fd = new FormData(); fd.append("image", file);
    return api.post(`/banner/uploadImage/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  bulkAdd:            (body: any)            => api.post("/banner/bulk-add",         body),
  bulkActivate:       (body: any)            => api.post("/banner/bulk-activate",    body),
  bulkDeactivate:     (body: any)            => api.post("/banner/bulk-deactivate",  body),

  // ── Blog ────────────────────────────────────────────────────────────────
  createBlog:         (body: any)            => api.post("/blog",                    body),
  getBlogs:           ()                     => api.get("/blog/admin/list"),
  updateBlog:         (id: string, body: any)=> api.put(`/blog/${id}`,              body),
  deleteBlog:         (id: string)           => api.delete(`/blog/${id}`),
  uploadBlogImage:    (id: string, file: File) => {
    const fd = new FormData(); fd.append("image", file);
    return api.post(`/blog/uploadImage/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },

  // ── Featured Products ───────────────────────────────────────────────────
  addFeatured:        (body: any)            => api.post("/featured-product",        body),
  getFeatured:        ()                     => api.get("/featured-product/admin/list"),
  deleteFeatured:     (id: string)           => api.delete(`/featured-product/${id}`),
  reorderFeatured:    (body: any)            => api.post("/featured-product/reorder", body),
};
