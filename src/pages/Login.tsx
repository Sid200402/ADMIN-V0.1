import { useState } from "react";
import { Form, Input, Button, Alert, Modal, Typography, Tag } from "antd";
import {
  UserOutlined, LockOutlined, LoginOutlined,
  DesktopOutlined, EnvironmentOutlined, GlobalOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { authService } from "../api/services";
import { useAuth } from "../hooks/useAuth";
import type { LoginRequest, ActiveSession, User } from "../types";

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [pendingCreds, setPendingCreds] = useState<LoginRequest | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const decodeUser = (token: string, roles?: string): User => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: payload.id || payload.sub || "",
        name: payload.name || "Admin",
        email: payload.email || "",
        role: roles || payload.role || "ADMIN",
        permissions: payload.permissions || [],
      };
    } catch {
      return { id: "", name: "Admin", email: "", role: roles || "ADMIN", permissions: [] };
    }
  };

  const handleLogin = async (values: { loginId: string; password: string }) => {
    setLoading(true);
    setError(null);
    const body: LoginRequest = { ...values, lat: "0", lng: "0" };
    try {
      const { data: res } = await authService.login(body);
      const accessToken = res.accessToken;
      const refreshToken = res.refreshToken;
      const roles = res.roles;
      if (accessToken) {
        const user = res.user || decodeUser(accessToken, roles);
        login(user, accessToken, refreshToken);
        navigate("/dashboard");
      }
    } catch (err: any) {
      const res = err.response?.data;

      if (res?.code === "ACTIVE_SESSION_EXISTS") {
        // Handle both flat response and nested data.activeSession
        const session: ActiveSession = res.data?.activeSession ?? {
          sessionId: res.sessionId,
          deviceInfo: res.deviceInfo,
          city: res.city,
          country: res.country,
          ip: res.ip,
          loginAt: res.loginAt,
          lastActivity: res.lastActivity,
        };
        setActiveSession(session);
        setPendingCreds(body);
      } else if (res?.status === 429) {
        const mins = Math.ceil((res.error?.retryAfter || 300) / 60);
        setError(`Too many attempts. Try again in ${mins} minutes.`);
      } else if (res?.status === 403) {
        setError("Your account is locked. Contact administrator.");
      } else {
        setError(res?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAndLogin = async () => {
    if (!pendingCreds) return;
    setRevokeLoading(true);
    try {
      const { data: res } = await authService.revokeAllAndLogin(pendingCreds);
      const accessToken = res.accessToken;
      const refreshToken = res.refreshToken;
      const roles = res.roles;
      if (accessToken) {
        const user = res.user || decodeUser(accessToken, roles);
        login(user, accessToken, refreshToken);
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to revoke sessions.");
      setActiveSession(null);
    } finally {
      setRevokeLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-md mx-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <LoginOutlined style={{ fontSize: 28, color: "#fff" }} />
          </div>
          <Title level={2} style={{ color: "#fff", margin: 0 }}>Admin Panel</Title>
          <Text style={{ color: "#94a3b8" }}>Sign in to your account</Text>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <Alert
              type="error"
              message={error}
              closable
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}

          <Form layout="vertical" onFinish={handleLogin} size="large" requiredMark={false}>
            <Form.Item
              name="loginId"
              rules={[{ required: true, message: "Please enter your email or username" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Email or Username"
                className="login-input"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  borderRadius: 10,
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Password"
                className="login-input"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  borderRadius: 10,
                }}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 46, borderRadius: 10, fontWeight: 600, fontSize: 15, background: "#2563eb" }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <style>{`
            .login-input,
            .login-input .ant-input,
            .login-input input {
              background: rgba(255,255,255,0.07) !important;
              color: #fff !important;
            }
            .login-input .ant-input::placeholder,
            .login-input input::placeholder {
              color: #64748b !important;
            }
            .login-input .ant-input-password-icon,
            .login-input .anticon {
              color: #94a3b8 !important;
            }
            .login-input:hover,
            .login-input:focus-within {
              border-color: #3b82f6 !important;
            }
          `}</style>
        </div>
      </div>

      {/* Active Session Modal */}
      <Modal
        open={!!activeSession}
        title={
          <div className="flex items-center gap-2">
            <span style={{ color: "#f59e0b", fontSize: 18 }}>⚠️</span>
            <span>Active Session Detected</span>
          </div>
        }
        onCancel={() => setActiveSession(null)}
        footer={[
          <Button key="cancel" onClick={() => setActiveSession(null)} disabled={revokeLoading}>
            Cancel
          </Button>,
          <Button
            key="revoke"
            type="primary"
            danger
            loading={revokeLoading}
            onClick={handleRevokeAndLogin}
          >
            Yes, Revoke & Login
          </Button>,
        ]}
      >
        {activeSession && (
          <div>
            <Alert
              type="warning"
              message="You already have an active session on another device."
              className="mb-4"
            />

            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <DesktopOutlined style={{ color: "#2563eb", marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>DEVICE</div>
                    <div style={{ fontSize: 13, color: "#1e293b", wordBreak: "break-all" }}>
                      {activeSession.deviceInfo}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <EnvironmentOutlined style={{ color: "#2563eb", marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>LOCATION</div>
                    <div style={{ fontSize: 13, color: "#1e293b" }}>
                      {activeSession.city && activeSession.country
                        ? `${activeSession.city}, ${activeSession.country}`
                        : <Tag color="default">Unknown</Tag>}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <GlobalOutlined style={{ color: "#2563eb", marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>IP ADDRESS</div>
                    <div style={{ fontSize: 13, color: "#1e293b", fontFamily: "monospace" }}>
                      {activeSession.ip}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ClockCircleOutlined style={{ color: "#2563eb", marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>LOGGED IN AT</div>
                    <div style={{ fontSize: 13, color: "#1e293b" }}>
                      {formatDate(activeSession.loginAt)}
                    </div>
                  </div>
                </div>

                {activeSession.lastActivity && (
                  <div className="flex items-start gap-3">
                    <ClockCircleOutlined style={{ color: "#f59e0b", marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>LAST ACTIVITY</div>
                      <div style={{ fontSize: 13, color: "#1e293b" }}>
                        {formatDate(activeSession.lastActivity)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, marginBottom: 0 }}>
              Clicking "Yes, Revoke & Login" will sign out all other active sessions and log you in.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
