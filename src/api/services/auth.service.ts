import api from "../axiosInstance";
import type { LoginRequest } from "../../types";

//apis
export const authService = {
  login: (body: LoginRequest) =>
    api.post("/auth/admin/login", body),

  logout: () =>
    api.post("/auth/logout", {}),

  revokeAllAndLogin: (body: LoginRequest) =>
    api.post("/auth/revoke-all-and-login", body),

  refreshToken: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),
};
