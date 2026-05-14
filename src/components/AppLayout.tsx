import { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Tooltip, Badge } from "antd";
import {
  DashboardOutlined, AppstoreOutlined, TagsOutlined, ShopOutlined,
  GoldOutlined, ColumnWidthOutlined, ShoppingOutlined, HomeOutlined,
  InboxOutlined, FileTextOutlined, WarningOutlined, BarChartOutlined,
  WalletOutlined, UserOutlined, PictureOutlined, BarcodeOutlined,
  TeamOutlined, PercentageOutlined, GroupOutlined, BellOutlined,
  HistoryOutlined, CloudUploadOutlined, FileDoneOutlined,
  DollarOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  BulbOutlined, BulbFilled,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authService, notificationService } from "../api/services";
import { useAuth } from "../hooks/useAuth";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

function NotifTicker({ items }: { items: any[] }) {
  if (!items.length) return null;

  const text = items.map((n: any) =>
    `🔔 ${n.title}${n.message || n.desc ? " — " + (n.message || n.desc || "") : ""}`
  ).join("          •          ");

  // Speed: ~60px/s — longer text = longer duration for consistent speed
  const duration = Math.max(20, text.length * 0.09);

  return (
    <div style={{ overflow: "hidden", width: "100%", position: "relative", height: 22 }}>
      <style>{`
        @keyframes notif-scroll {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .notif-marquee {
          position: absolute;
          white-space: nowrap;
          animation: notif-scroll ${duration}s linear infinite;
          color: #2563eb;
          font-size: 12.5px;
          font-weight: 500;
          line-height: 22px;
          cursor: default;
        }
        .notif-marquee:hover { animation-play-state: paused; }
      `}</style>
      <span className="notif-marquee">{text}</span>
    </div>
  );
}

const menuItems = [
  // ── Main ──────────────────────────────────────────────
  { key: "/dashboard",             icon: <DashboardOutlined />,   label: "Dashboard" },
  { key: "/bills",                 icon: <FileDoneOutlined />,    label: "Bills" },
  { key: "/cash-management",       icon: <DollarOutlined />,      label: "Cash Management" },

  // ── Master Data ───────────────────────────────────────
  { key: "/store",                 icon: <HomeOutlined />,        label: "Store" },
  { key: "/master-brands",         icon: <GoldOutlined />,        label: "Master Brands" },
  { key: "/brands",                icon: <ShopOutlined />,        label: "Brands" },
  { key: "/category",              icon: <TagsOutlined />,        label: "Category" },
  { key: "/model",                 icon: <AppstoreOutlined />,    label: "Model" },
  { key: "/unit",                  icon: <ColumnWidthOutlined />, label: "Unit" },
  { key: "/tax-rates",             icon: <PercentageOutlined />,  label: "Tax Rates" },
  { key: "/price-group",           icon: <GroupOutlined />,       label: "Price Group" },

  // ── Products & Stock ──────────────────────────────────
  { key: "/products",              icon: <ShoppingOutlined />,    label: "Products" },
  { key: "/inventory",             icon: <InboxOutlined />,       label: "Inventory" },
  { key: "/purchase-requisition",  icon: <FileTextOutlined />,    label: "Purchase Requisition" },
  { key: "/defective-stock",       icon: <WarningOutlined />,     label: "Defective Stock" },
  { key: "/barcode",               icon: <BarcodeOutlined />,     label: "Barcode" },

  // ── Finance ───────────────────────────────────────────
  { key: "/expense",               icon: <WalletOutlined />,      label: "Expense" },
  { key: "/reports",               icon: <BarChartOutlined />,    label: "Reports" },

  // ── People ────────────────────────────────────────────
  { key: "/customers",             icon: <UserOutlined />,        label: "Customers" },
  { key: "/staff",                 icon: <TeamOutlined />,        label: "Staff" },

  // ── Marketing ─────────────────────────────────────────
  { key: "/banners-ads",           icon: <PictureOutlined />,     label: "Banners & Ads" },
  { key: "/notification",          icon: <BellOutlined />,        label: "Notification" },

  // ── System ────────────────────────────────────────────
  { key: "/login-history",         icon: <HistoryOutlined />,     label: "Login History" },
  { key: "/backup-restore",        icon: <CloudUploadOutlined />, label: "Backup & Restore" },
];

const navKeys: Record<string, string> = {
  "1": "/dashboard",
  "2": "/bills",
  "3": "/cash-management",
  "4": "/store",
  "5": "/master-brands",
  "6": "/brands",
  "7": "/category",
  "8": "/model",
  "9": "/unit",
  "0": "/tax-rates",
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const now = useClock();

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  const countQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationService.getUnreadCount().then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const unreadCount: number = countQuery.data?.count || countQuery.data?.unreadCount || 0;

  const notifQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll().then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const latestNotifs: any[] = (notifQuery.data?.result || notifQuery.data?.data || notifQuery.data || [])
    .filter((n: any) => !n.read);

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "b") { e.preventDefault(); setCollapsed(c => !c); }
      if (e.altKey && navKeys[e.key]) { e.preventDefault(); navigate(navKeys[e.key]); }
      if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        const active = document.querySelector<HTMLElement>(".ant-layout-sider .ant-menu-item-selected");
        const first  = document.querySelector<HTMLElement>(".ant-layout-sider .ant-menu-item");
        const target = active ?? first;
        if (target) { target.focus(); document.body.classList.add("sidebar-focused"); }
      }
    };

    // capture phase — intercept arrow keys while sidebar is focused
    // before they bubble up to usePageShortcuts on window
    const siderCapture = (e: KeyboardEvent) => {
      if (!document.body.classList.contains("sidebar-focused")) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") {
        e.stopPropagation();
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        document.body.classList.remove("sidebar-focused");
        (document.activeElement as HTMLElement)?.blur();
      }
    };

    const onFocusOut = (e: Event) => {
      if (!((e as FocusEvent).relatedTarget as HTMLElement)?.closest(".ant-layout-sider"))
        document.body.classList.remove("sidebar-focused");
    };

    const sider = document.querySelector(".ant-layout-sider");
    sider?.addEventListener("focusout", onFocusOut as EventListener);
    window.addEventListener("keydown", siderCapture, true);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keydown", siderCapture, true);
      sider?.removeEventListener("focusout", onFocusOut as EventListener);
    };
  }, [navigate]);

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    logout();
    navigate("/login");
  };

  const userMenu = {
    items: [
      { key: "profile", icon: <UserOutlined />, label: user?.name || "Profile" },
    ],
    onClick: () => {},
  };

  const bg = dark ? "#0f172a" : "#fff";
  const fg = dark ? "#f1f5f9" : "#1e293b";
  const sub = dark ? "#94a3b8" : "#94a3b8";
  const border = dark ? "#1e293b" : "#f0f0f0";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={230}
        style={{
          background: "#0f172a",
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div style={{
          padding: collapsed ? "16px 8px" : "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#2563eb", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <DashboardOutlined style={{ color: "#fff", fontSize: 16 }} />
          </div>
          {!collapsed && (
            <Text strong style={{ color: "#fff", fontSize: 15, whiteSpace: "nowrap" }}>
              RK World
            </Text>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ background: "#0f172a", border: "none", marginTop: 8 }}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
            document.body.classList.remove("sidebar-focused");
            (document.activeElement as HTMLElement)?.blur();
          }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 230, transition: "margin 0.2s", background: dark ? "#1e293b" : "#f8fafc" }}>
        <Header style={{
          background: bg,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${border}`,
          position: "sticky",
          top: 0,
          zIndex: 99,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          gap: 12,
          minWidth: 0,
        }}>
          {/* Left: collapse button + clock */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18, color: fg }}
            />
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: fg, fontVariantNumeric: "tabular-nums", letterSpacing: 0.5 }}>{timeStr}</div>
              <div style={{ fontSize: 10, color: sub }}>{dateStr}</div>
            </div>
          </div>

          {/* Center: notification ticker */}
          <div style={{ flex: 1, overflow: "hidden", minWidth: 0, padding: "0 16px" }}>
            {latestNotifs.length > 0
              ? <NotifTicker items={latestNotifs} />
              : null
            }
          </div>

          {/* Right: dark mode + user + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Tooltip title="Notifications">
              <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  onClick={() => navigate("/notification")}
                  style={{ fontSize: 18, color: fg }}
                />
              </Badge>
            </Tooltip>

            <Tooltip title={dark ? "Light mode" : "Dark mode"}>
              <Button
                type="text"
                icon={dark ? <BulbFilled style={{ color: "#facc15" }} /> : <BulbOutlined />}
                onClick={() => setDark(d => !d)}
                style={{ fontSize: 18, color: fg }}
              />
            </Tooltip>

            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Avatar style={{ background: "#2563eb", flexShrink: 0 }} icon={<UserOutlined />} />
                <div style={{ maxWidth: 120, lineHeight: "normal" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: sub }}>{user?.role}</div>
                </div>
              </div>
            </Dropdown>

            <Tooltip title="Logout">
              <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout} style={{ fontSize: 16 }} />
            </Tooltip>
          </div>
        </Header>

        <Content style={{ margin: "24px", minHeight: "calc(100vh - 112px)", color: fg }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
