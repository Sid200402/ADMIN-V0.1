import api from "../axiosInstance";

export const staffService = {
  addStaff:        (body: any) => api.post("/account/add-staff",          body),
  addManager:      (body: any) => api.post("/account/add-staff_Manager",  body),
  addSalesStaff:   (body: any) => api.post("/account/add-salesStaff",     body),

  getAll:          ()          => api.get("/account/staff"),
  getProfile:      (id: string) => api.get(`/account/staff/profile/${id}`),

  update:          (id: string, body: any) => api.put(`/account/update/staff/${id}`,    body),
  adminUpdate:     (id: string, body: any) => api.put(`/staff-detail/admin/${id}`,      body),
  updatePassword:  (id: string, body: any) => api.put(`/account/staff/password/${id}`,  body),
  updateStatus:    (id: string, body: any) => api.put(`/account/staff/status/${id}`,    body),
  delete:          (id: string)            => api.delete(`/account/staff/${id}`),

  getPermissions:  (id: string)            => api.get(`/user-permissions/${id}`),
  updatePermissions:(id: string, body: any[]) => api.put(`/user-permissions/${id}`, body),
};
