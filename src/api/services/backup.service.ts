import api from "../axiosInstance";

export const backupService = {
  createBackup: () =>
    api.get("/backup/create", { responseType: "blob" }),

  syncNow: () =>
    api.get("/backup/sync-now"),

  restore: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/backup/restore", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};
