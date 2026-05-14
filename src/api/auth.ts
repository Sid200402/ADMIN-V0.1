import api from "./axiosInstance";
import type { LoginRequest } from "../types";

export const loginApi = (body: LoginRequest) =>
  api.post("/auth/admin/login", body);

export const logoutApi = () =>
  api.post("/auth/logout", {});

export const revokeAllAndLoginApi = (body: LoginRequest) =>
  api.post("/auth/revoke-all-and-login", body);
