import { useState, useCallback, useRef, useEffect } from "react";
import {
  Table, Tag, Button, Input, Select, Modal, Form,
  InputNumber, Spin, Alert, Tooltip, DatePicker, message, Card,
} from "antd";
import {
  PlusOutlined, LockOutlined, UnlockOutlined,
  SwapOutlined, EyeOutlined, SearchOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashService } from "../api/services";
import api from "../api/axiosInstance";
import ShortcutHelp from "../components/ShortcutHelp";
import type { ColumnType } from "antd/es/table";

const fmt = (v: any) => `₹${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().split("T")[0];

type Tab = "dashboard" | "drawers" | "cashout" | "transfers" | "bank";

const StatCard = ({ title, value, color }: { title: string; value: string; color: string }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderLeft: `4px solid ${color}` }}>
    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
  </div>
);

export default function CashManagement() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("dashboard");

  // ── Dashboard state ────────────────────────────────────────────────────────
  const [statsDate, setStatsDate] = useState(today());

  // ── Drawers state ──────────────────────────────────────────────────────────
  const [drawerPage, setDrawerPage]     = useState(1);
  const limit                           = 10;
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStore, setFilterStore]   = useState("");
  const [filterStart, setFilterStart]   = useState("");
  const [filterEnd, setFilterEnd]       = useState("");
  const [cashierSearch, setCashierSearch] = useState("");
  const [openDrawerModal, setOpenDrawerModal]   = useState(false);
  const [closeDrawerModal, setCloseDrawerModal] = useState<any>(null);
  const [addCashModal, setAddCashModal]         = useState<any>(null);
  const [transferModal, setTransferModal]       = useState(false);
  const [viewDrawer, setViewDrawer]             = useState<string | null>(null);

  const [openForm]    = Form.useForm();
  const [closeForm]   = Form.useForm();
  const [addCashForm] = Form.useForm();
  const [transferForm]= Form.useForm();

  // ── Cash-Out state ──────────────────────────────────────────────────────────
  const [cashoutSubTab, setCashoutSubTab] = useState<"pending" | "history">("pending");
  const [cashoutStore, setCashoutStore]   = useState("");
  const [cashoutPage, setCashoutPage]     = useState(1);
  const [rejectModal, setRejectModal]     = useState<any>(null);
  const [rejectForm]                      = Form.useForm();

  // ── Transfers state ────────────────────────────────────────────────────────
  const [transferPage, setTransferPage] = useState(1);

  // ── Bank state ─────────────────────────────────────────────────────────────
  const [bankStore, setBankStore]               = useState("");
  const [bankTxnPage, setBankTxnPage]           = useState(1);
  const [bankTxnStart, setBankTxnStart]         = useState("");
  const [bankTxnEnd, setBankTxnEnd]             = useState("");
  const [bankAccountModal, setBankAccountModal] = useState(false);
  const [bankTransferModal, setBankTransferModal] = useState(false);
  const [withdrawalModal, setWithdrawalModal]   = useState(false);
  const [rejectWithdrawalModal, setRejectWithdrawalModal] = useState<any>(null);
  const [bankAccountForm]    = Form.useForm();
  const [bankTransferForm]   = Form.useForm();
  const [withdrawalForm]     = Form.useForm();
  const [rejectWithdrawalForm] = Form.useForm();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleCashierSearch = useCallback((val: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCashierSearch(val), 500);
  }, []);

  const TABS: Tab[] = ["dashboard", "drawers", "cashout", "transfers", "bank"];

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const anyModalOpen = openDrawerModal || !!closeDrawerModal || !!addCashModal ||
      transferModal || !!viewDrawer || !!rejectModal || bankAccountModal ||
      bankTransferModal || withdrawalModal || !!rejectWithdrawalModal;

    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable ||
        document.body.classList.contains("sidebar-focused");

      if (e.altKey) {
        if (e.key === "o" || e.key === "O") { e.preventDefault(); setOpenDrawerModal(true); return; }
        if (e.key === "t" || e.key === "T") { e.preventDefault(); setTransferModal(true); return; }
        return;
      }

      if (isInput || anyModalOpen) return;

      if (e.key === "1") { e.preventDefault(); setTab("dashboard"); }
      if (e.key === "2") { e.preventDefault(); setTab("drawers"); }
      if (e.key === "3") { e.preventDefault(); setTab("cashout"); }
      if (e.key === "4") { e.preventDefault(); setTab("transfers"); }
      if (e.key === "5") { e.preventDefault(); setTab("bank"); }

      if (tab === "cashout") {
        if (e.key === "p" || e.key === "P") { e.preventDefault(); setCashoutSubTab("pending"); }
        if (e.key === "h" || e.key === "H") { e.preventDefault(); setCashoutSubTab("history"); }
      }
      if (tab === "transfers" && (e.key === "n" || e.key === "N")) {
        e.preventDefault(); setTransferModal(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [openDrawerModal, closeDrawerModal, addCashModal, transferModal, viewDrawer,
      rejectModal, bankAccountModal, bankTransferModal, withdrawalModal,
      rejectWithdrawalModal, tab]);

  // ── Stores list ────────────────────────────────────────────────────────────
  const storesQuery = useQuery({
    queryKey: ["stores-list"],
    queryFn: () => api.get("/store", { params: { limit: 100, offset: 0 } }).then(r => {
      const d = r.data;
      return Array.isArray(d) ? d
        : Array.isArray(d?.result) ? d.result
        : Array.isArray(d?.data?.result) ? d.data.result
        : Array.isArray(d?.data) ? d.data
        : [];
    }),
    staleTime: 600_000,
  });

  useEffect(() => {
    if (!bankStore && storesQuery.data?.length) {
      const def = storesQuery.data.find((s: any) => s.defaultStore) ?? storesQuery.data[0];
      if (def) setBankStore(def.id);
    }
  }, [storesQuery.data, bankStore]);

  const storeOptions = [
    { value: "", label: "All Stores" },
    ...(storesQuery.data || []).map((s: any) => ({ value: s.id, label: s.name })),
  ];

  // ── Available cashiers ─────────────────────────────────────────────────────
  const cashiersQuery = useQuery({
    queryKey: ["available-cashiers", filterStore],
    queryFn: () => cashService.getAvailableCashiers(filterStore || undefined).then(r => {
      return Array.isArray(r.data) ? r.data : r.data?.data || [];
    }),
    enabled: openDrawerModal,
    staleTime: 60_000,
  });

  // ── Dashboard stats ────────────────────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ["cash-stats", statsDate],
    queryFn: async () => {
      const r = await cashService.getDashboardStats(statsDate);
      return r.data?.totals || r.data?.data || r.data;
    },
    staleTime: 30_000,
  });

  // ── Drawers list ───────────────────────────────────────────────────────────
  const drawersQuery = useQuery({
    queryKey: ["drawers", drawerPage, filterStatus, filterStore, filterStart, filterEnd, cashierSearch],
    queryFn: async () => {
      const r = await cashService.getAllDrawers({
        limit, offset: (drawerPage - 1) * limit,
        status: filterStatus, storeId: filterStore,
        startDate: filterStart, endDate: filterEnd,
        cashierName: cashierSearch,
      });
      const raw = r.data;
      return {
        result: raw?.drawers || raw?.data?.result || raw?.result || [],
        total:  raw?.pagination?.total || raw?.data?.total || raw?.total || 0,
      };
    },
    enabled: tab === "drawers",
    staleTime: 30_000,
  });

  // ── Drawer detail ──────────────────────────────────────────────────────────
  const drawerDetailQuery = useQuery({
    queryKey: ["drawer-detail", viewDrawer],
    queryFn: () => cashService.getDrawerSummary(viewDrawer!).then(r => r.data?.data || r.data),
    enabled: !!viewDrawer,
    staleTime: 0,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["drawers"] });
    qc.invalidateQueries({ queryKey: ["cash-stats"] });
  };

  // ── Transfer history query ─────────────────────────────────────────────────
  const transferHistoryQuery = useQuery({
    queryKey: ["transfer-history", transferPage],
    queryFn: () => cashService.getTransferHistory({ limit: 15, offset: (transferPage - 1) * 15 })
      .then(r => { const d = r.data; return { result: d?.data || d?.result || [], total: d?.total || 0 }; }),
    enabled: tab === "transfers",
    staleTime: 30_000,
  });

  // ── Bank queries ───────────────────────────────────────────────────────────
  const bankAccountQuery = useQuery({
    queryKey: ["bank-account", bankStore],
    queryFn: () => cashService.getBankAccount(bankStore).then(r => r.data?.data || r.data),
    enabled: tab === "bank" && !!bankStore,
    staleTime: 30_000,
  });

  const bankTxnQuery = useQuery({
    queryKey: ["bank-txns", bankStore, bankTxnPage, bankTxnStart, bankTxnEnd],
    queryFn: () => cashService.getBankTransactions({ storeId: bankStore, limit: 15, offset: (bankTxnPage - 1) * 15, startDate: bankTxnStart || undefined, endDate: bankTxnEnd || undefined })
      .then(r => { const d = r.data; return { result: d?.data || d?.result || [], total: d?.total || 0 }; }),
    enabled: tab === "bank" && !!bankStore,
    staleTime: 30_000,
  });

  const pendingWithdrawalsQuery = useQuery({
    queryKey: ["pending-withdrawals", bankStore],
    queryFn: () => cashService.getPendingWithdrawals(bankStore).then(r => { const d = r.data; return d?.data || d?.result || []; }),
    enabled: tab === "bank" && !!bankStore,
    staleTime: 30_000,
  });

  const invalidateBank = () => {
    qc.invalidateQueries({ queryKey: ["bank-account", bankStore] });
    qc.invalidateQueries({ queryKey: ["bank-txns", bankStore] });
    qc.invalidateQueries({ queryKey: ["pending-withdrawals", bankStore] });
    qc.invalidateQueries({ queryKey: ["cash-stats"] });
  };

  // ── Bank mutations ─────────────────────────────────────────────────────────
  const saveBankAccountMutation = useMutation({
    mutationFn: (v: any) => cashService.saveBankAccount(v),
    onSuccess: () => { message.success("Bank account saved"); setBankAccountModal(false); bankAccountForm.resetFields(); invalidateBank(); },
    onError: () => message.error("Failed to save bank account"),
  });

  const bankTransferMutation = useMutation({
    mutationFn: (v: any) => cashService.bankTransfer(v),
    onSuccess: () => { message.success("Bank transfer done"); setBankTransferModal(false); bankTransferForm.resetFields(); invalidateBank(); },
    onError: () => message.error("Failed to transfer"),
  });

  const withdrawalRequestMutation = useMutation({
    mutationFn: (v: any) => cashService.requestBankWithdrawal({ storeId: bankStore, ...v }),
    onSuccess: () => { message.success("Withdrawal requested"); setWithdrawalModal(false); withdrawalForm.resetFields(); invalidateBank(); },
    onError: () => message.error("Failed to request withdrawal"),
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: (id: string) => cashService.approveWithdrawal(id, "Approved by admin"),
    onSuccess: () => { message.success("Withdrawal approved"); invalidateBank(); },
    onError: () => message.error("Failed to approve"),
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cashService.rejectWithdrawal(id, reason),
    onSuccess: () => { message.success("Withdrawal rejected"); setRejectWithdrawalModal(null); rejectWithdrawalForm.resetFields(); invalidateBank(); },
    onError: () => message.error("Failed to reject"),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const openMutation = useMutation({
    mutationFn: (v: any) => cashService.openDrawer(v),
    onSuccess: () => { message.success("Drawer opened"); setOpenDrawerModal(false); openForm.resetFields(); invalidate(); },
    onError: () => message.error("Failed to open drawer"),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => cashService.closeDrawer(id, body),
    onSuccess: () => { message.success("Drawer closed"); setCloseDrawerModal(null); closeForm.resetFields(); invalidate(); },
    onError: () => message.error("Failed to close drawer"),
  });

  const addCashMutation = useMutation({
    mutationFn: (v: any) => cashService.addCash(v),
    onSuccess: () => { message.success("Cash added"); setAddCashModal(null); addCashForm.resetFields(); invalidate(); },
    onError: () => message.error("Failed to add cash"),
  });

  const transferMutation = useMutation({
    mutationFn: (v: any) => cashService.transferCash(v),
    onSuccess: () => { message.success("Transferred"); setTransferModal(false); transferForm.resetFields(); invalidate(); },
    onError: () => message.error("Failed to transfer"),
  });

  // ── Cash-Out queries ──────────────────────────────────────────────────────
  const pendingCashOutQuery = useQuery({
    queryKey: ["pending-cashout", cashoutStore],
    queryFn: () => cashService.getPendingCashOut({ limit: 50, offset: 0, storeId: cashoutStore || undefined })
      .then(r => { const d = r.data; return { result: d?.data?.result || d?.result || [], total: d?.data?.total || d?.total || 0 }; }),
    enabled: tab === "cashout" && cashoutSubTab === "pending",
    staleTime: 30_000,
  });

  const cashOutHistoryQuery = useQuery({
    queryKey: ["cashout-history", cashoutPage, cashoutStore],
    queryFn: () => cashService.getCashOutHistory({ limit: 10, offset: (cashoutPage - 1) * 10, storeId: cashoutStore || undefined })
      .then(r => {
        const d = r.data;
        return {
          result: d?.history || d?.data?.result || d?.result || [],
          total:  d?.pagination?.total || d?.data?.total || d?.total || 0,
        };
      }),
    enabled: tab === "cashout" && cashoutSubTab === "history",
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => cashService.approveCashOut(id, "Approved by admin"),
    onSuccess: () => { message.success("Approved"); qc.invalidateQueries({ queryKey: ["pending-cashout"] }); qc.invalidateQueries({ queryKey: ["cashout-history"] }); invalidate(); },
    onError: () => message.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cashService.rejectCashOut(id, reason),
    onSuccess: () => { message.success("Rejected"); setRejectModal(null); rejectForm.resetFields(); qc.invalidateQueries({ queryKey: ["pending-cashout"] }); qc.invalidateQueries({ queryKey: ["cashout-history"] }); },
    onError: () => message.error("Failed to reject"),
  });

  // ── Drawer table columns ───────────────────────────────────────────────────
  const drawerColumns: ColumnType<any>[] = [
    { title: "Cashier", key: "cashier", render: (_: any, r: any) => <div><div style={{ fontWeight: 600 }}>{r.cashier?.name || "—"}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{r.cashier?.email}</div></div> },
    { title: "Store",   key: "store",   render: (_: any, r: any) => r.store?.name || "—" },
    { title: "Status",  key: "status",  render: (_: any, r: any) => <Tag color={r.isOpen ? "green" : "default"}>{r.isOpen ? "OPEN" : "CLOSED"}</Tag> },
    { title: "Opening", dataIndex: "openingAmount", key: "opening", align: "right" as const, render: fmt },
    { title: "Balance", key: "balance", align: "right" as const, render: (_: any, r: any) => <span style={{ fontWeight: 700, color: "#059669" }}>{fmt(r.currentBalance ?? r.summary?.currentBalance)}</span> },
    { title: "Sales",   key: "sales",   align: "right" as const, render: (_: any, r: any) => fmt(r.summary?.totalSales) },
    { title: "Cash In", key: "cashin",  align: "right" as const, render: (_: any, r: any) => <span style={{ color: "#059669" }}>{fmt(r.summary?.totalCashIn)}</span> },
    { title: "Cash Out",key: "cashout", align: "right" as const, render: (_: any, r: any) => <span style={{ color: "#dc2626" }}>{fmt(r.summary?.totalCashOut)}</span> },
    { title: "Opened",  dataIndex: "openedAt", key: "openedAt", render: (v: string) => v ? new Date(v).toLocaleString("en-IN") : "—" },
    {
      title: "Actions", key: "actions", align: "center" as const,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setViewDrawer(r.id)} /></Tooltip>
          {r.isOpen && <>
            <Tooltip title="Add Cash"><Button size="small" icon={<PlusOutlined />} style={{ color: "#059669", borderColor: "#059669" }} onClick={() => setAddCashModal(r)} /></Tooltip>
            <Tooltip title="Close"><Button size="small" danger icon={<LockOutlined />} onClick={() => setCloseDrawerModal(r)} /></Tooltip>
          </>}
        </div>
      ),
    },
  ];

  const stats = statsQuery.data;

  const tabBtn = (t: Tab, label: string, num: number) => (
    <button key={t} onClick={() => setTab(t)} style={{
      padding: "7px 18px", fontSize: 13, fontWeight: 600,
      border: "none", borderRadius: 8, cursor: "pointer",
      background: tab === t ? "#111827" : "#f1f5f9",
      color: tab === t ? "#fff" : "#374151",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <kbd style={{
        background: tab === t ? "rgba(255,255,255,0.2)" : "#e2e8f0",
        border: `1px solid ${tab === t ? "rgba(255,255,255,0.35)" : "#cbd5e1"}`,
        borderRadius: 4, padding: "0 5px", fontSize: 10,
        fontFamily: "monospace", color: tab === t ? "#fff" : "#64748b",
      }}>{num}</kbd>
      {label}
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Cash Management</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage drawers, cash-out, transfers and bank</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="primary" icon={<UnlockOutlined />} onClick={() => setOpenDrawerModal(true)} style={{ background: "#2563eb" }}>Open Drawer <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 }}>Alt+O</kbd></Button>
          <Button icon={<SwapOutlined />} onClick={() => setTransferModal(true)}>Transfer <kbd style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6, color: "#64748b" }}>Alt+T</kbd></Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabBtn("dashboard", "Dashboard", 1)}
        {tabBtn("drawers",   "Drawers",   2)}
        {tabBtn("cashout",   "Cash-Out",  3)}
        {tabBtn("transfers", "Transfers", 4)}
        {tabBtn("bank",      "Bank",      5)}
      </div>

      {/* ── TAB 1: DASHBOARD ── */}
      {tab === "dashboard" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <DatePicker
              onChange={(_, s) => setStatsDate((s as string) || today())}
              format="YYYY-MM-DD"
              placeholder="Select date"
              style={{ width: 160 }}
            />
            {statsQuery.isLoading && <Spin size="small" />}
          </div>

          {statsQuery.isError && <Alert type="error" message="Failed to load stats." className="mb-4" />}

          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              <StatCard title="Active Drawers"     value={String(stats.activeDrawers          ?? stats.totalDrawersOpen    ?? 0)} color="#2563eb" />
              <StatCard title="Total Drawer Value" value={fmt(stats.totalDrawerValue          ?? stats.totalCashInDrawers)}       color="#059669" />
              <StatCard title="Total Bank Value"   value={fmt(stats.totalBankValue)}                                              color="#0891b2" />
              <StatCard title="Cash + Bank"        value={fmt(stats.totalCashAndBank)}                                            color="#7c3aed" />
              <StatCard title="Today Sales"        value={fmt(stats.todayTotalSales           ?? stats.totalSales)}               color="#16a34a" />
              <StatCard title="Today Cash Sales"   value={fmt(stats.todayCashSales)}                                              color="#059669" />
              <StatCard title="Today Bank Sales"   value={fmt(stats.todayBankSales)}                                              color="#0891b2" />
              <StatCard title="Total Expenses"     value={fmt(stats.totalExpenses)}                                               color="#dc2626" />
              <StatCard title="Total Cash Out"     value={fmt(stats.totalCashOut)}                                                color="#f97316" />
              <StatCard title="Pending Cash-Out"   value={String(stats.pendingCashOutRequests ?? stats.pendingCashOut    ?? 0)}  color="#f59e0b" />
              <StatCard title="Pending Withdrawals"value={String(stats.pendingBankWithdrawals ?? 0)}                              color="#e11d48" />
              <StatCard title="Total Stores"       value={String(stats.totalStores            ?? stats.storesWithOpenDrawers ?? 0)} color="#6d28d9" />
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: DRAWERS ── */}
      {tab === "drawers" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <Input prefix={<SearchOutlined style={{ color: "#9ca3af" }} />} placeholder="Search cashier..." onChange={e => handleCashierSearch(e.target.value)} style={{ width: 200 }} allowClear />
            <Select value={filterStatus} onChange={v => { setFilterStatus(v); setDrawerPage(1); }} style={{ width: 130 }}
              options={[{ value: "", label: "All Status" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} />
            <Select value={filterStore} onChange={v => { setFilterStore(v); setDrawerPage(1); }} style={{ width: 200 }} options={storeOptions} />
            <DatePicker placeholder="Start date" onChange={(_, s) => setFilterStart(s as string)} format="YYYY-MM-DD" style={{ width: 150 }} allowClear />
            <DatePicker placeholder="End date"   onChange={(_, s) => setFilterEnd(s as string)}   format="YYYY-MM-DD" style={{ width: 150 }} allowClear />
          </div>

          {drawersQuery.isError && <Alert type="error" message="Failed to load drawers." className="mb-4" />}

          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <Table
              columns={drawerColumns}
              dataSource={drawersQuery.data?.result || []}
              rowKey="id"
              loading={drawersQuery.isLoading || drawersQuery.isFetching}
              scroll={{ x: true }}
              size="middle"
              pagination={{ current: drawerPage, pageSize: limit, total: drawersQuery.data?.total || 0, onChange: setDrawerPage, showSizeChanger: false }}
            />
          </div>
        </>
      )}

      {/* ── TAB 3: CASH-OUT ── */}
      {tab === "cashout" && (
        <>
          {/* Sub-tabs + filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["pending", "history"] as const).map(t => (
                <button key={t} onClick={() => setCashoutSubTab(t)} style={{
                  padding: "6px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, cursor: "pointer",
                  background: cashoutSubTab === t ? "#111827" : "#f1f5f9",
                  color: cashoutSubTab === t ? "#fff" : "#374151",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <kbd style={{ background: cashoutSubTab === t ? "rgba(255,255,255,0.2)" : "#e2e8f0", border: `1px solid ${cashoutSubTab === t ? "rgba(255,255,255,0.35)" : "#cbd5e1"}`, borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", color: cashoutSubTab === t ? "#fff" : "#64748b" }}>{t === "pending" ? "P" : "H"}</kbd>
                  {t === "pending" ? "Pending" : "History"}
                </button>
              ))}
            </div>
            <Select value={cashoutStore} onChange={v => { setCashoutStore(v); setCashoutPage(1); }}
              style={{ width: 200 }} options={storeOptions} />
          </div>

          {/* Pending */}
          {cashoutSubTab === "pending" && (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <Table
                rowKey="id"
                loading={pendingCashOutQuery.isLoading}
                dataSource={pendingCashOutQuery.data?.result || []}
                scroll={{ x: true }}
                size="middle"
                pagination={false}
                columns={[
                  { title: "Requester", key: "req",   render: (_: any, r: any) => r.requester?.name || "—" },
                  { title: "Store",     key: "store", render: (_: any, r: any) => r.cashDrawer?.store?.name || "—" },
                  { title: "Amount",    dataIndex: "amount", key: "amount", align: "right" as const, render: fmt },
                  { title: "Description", dataIndex: "description", key: "desc", render: (v: string) => <span style={{ color: "#6b7280", fontSize: 12 }}>{v}</span> },
                  { title: "Requested", dataIndex: "createdAt", key: "createdAt", render: (v: string) => new Date(v).toLocaleString("en-IN") },
                  { title: "Status",    dataIndex: "status",    key: "status",    render: (v: string) => <Tag color="orange">{v}</Tag> },
                  {
                    title: "Actions", key: "actions", align: "center" as const,
                    render: (_: any, r: any) => (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <Tooltip title="Approve">
                          <Button size="small" type="primary" style={{ background: "#059669" }}
                            loading={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(r.id)}
                          >Approve</Button>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <Button size="small" danger onClick={() => setRejectModal(r)}>Reject</Button>
                        </Tooltip>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* History */}
          {cashoutSubTab === "history" && (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <Table
                rowKey="id"
                loading={cashOutHistoryQuery.isLoading}
                dataSource={cashOutHistoryQuery.data?.result || []}
                scroll={{ x: true }}
                size="middle"
                pagination={{ current: cashoutPage, pageSize: 10, total: cashOutHistoryQuery.data?.total || 0, onChange: setCashoutPage, showSizeChanger: false }}
                columns={[
                  { title: "Requester",   key: "req",      render: (_: any, r: any) => <div><div style={{ fontWeight: 600 }}>{r.requester?.name || "—"}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{r.cashDrawer?.store?.name}</div></div> },
                  { title: "Cashier",     key: "cashier",  render: (_: any, r: any) => r.cashDrawer?.cashier?.email || "—" },
                  { title: "Amount",      dataIndex: "amount",      key: "amount",  align: "right" as const, render: fmt },
                  { title: "Description", dataIndex: "description", key: "desc",    render: (v: string) => <span style={{ color: "#6b7280", fontSize: 12 }}>{v}</span> },
                  { title: "Status",      dataIndex: "status", key: "status",       render: (v: string) => <Tag color={v === "APPROVED" ? "green" : v === "REJECTED" ? "red" : "orange"}>{v}</Tag> },
                  { title: "Approved At", dataIndex: "approvedAt", key: "approvedAt", render: (v: string) => v ? new Date(v).toLocaleString("en-IN") : "—" },
                  { title: "Requested",   dataIndex: "createdAt",  key: "createdAt",  render: (v: string) => new Date(v).toLocaleString("en-IN") },
                ]}
              />
            </div>
          )}
        </>
      )}

      {/* ── TAB 4: TRANSFERS ── */}
      {tab === "transfers" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Button type="primary" icon={<SwapOutlined />} onClick={() => setTransferModal(true)} style={{ background: "#0891b2" }}>New Transfer <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 }}>N</kbd></Button>
          </div>

          {transferHistoryQuery.isError && <Alert type="error" message="Failed to load transfer history." style={{ marginBottom: 12 }} />}

          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <Table
              rowKey="id"
              loading={transferHistoryQuery.isLoading || transferHistoryQuery.isFetching}
              dataSource={transferHistoryQuery.data?.result || []}
              scroll={{ x: true }}
              size="middle"
              pagination={{ current: transferPage, pageSize: 15, total: transferHistoryQuery.data?.total || 0, onChange: setTransferPage, showSizeChanger: false }}
              columns={[
                {
                  title: "Type", dataIndex: "type", key: "type",
                  render: (v: string) => <Tag color={v === "TRANSFER_IN" ? "green" : "orange"}>{v?.replace("_", " ")}</Tag>,
                },
                { title: "Amount", dataIndex: "amount", key: "amount", align: "right" as const, render: fmt },
                { title: "Description", dataIndex: "description", key: "desc", render: (v: string) => <span style={{ color: "#6b7280", fontSize: 12 }}>{v || "—"}</span> },
                {
                  title: "Related Drawer", key: "related",
                  render: (_: any, r: any) => r.relatedDrawer ? (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{r.relatedDrawer.cashierName || "—"}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>ID: {r.relatedDrawer.drawerId}</div>
                    </div>
                  ) : "—",
                },
                { title: "Date", dataIndex: "createdAt", key: "createdAt", render: (v: string) => new Date(v).toLocaleString("en-IN") },
              ]}
            />
          </div>
        </>
      )}

      {/* ── TAB 5: BANK ── */}
      {tab === "bank" && (
        <>
          {/* Store selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Select
              value={bankStore || undefined}
              placeholder="Select a store"
              onChange={v => { setBankStore(v); setBankTxnPage(1); }}
              style={{ width: 220 }}
              options={storeOptions.filter(s => s.value)}
            />
            {bankStore && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <Button icon={<BankOutlined />} onClick={() => { bankAccountForm.setFieldsValue({ storeId: bankStore, ...bankAccountQuery.data }); setBankAccountModal(true); }}>
                  {bankAccountQuery.data ? "Edit Account" : "Add Account"}
                </Button>
                <Button icon={<SwapOutlined />} onClick={() => setBankTransferModal(true)} style={{ color: "#0891b2", borderColor: "#0891b2" }}>Bank Transfer</Button>
                <Button icon={<PlusOutlined />} onClick={() => setWithdrawalModal(true)} style={{ color: "#dc2626", borderColor: "#dc2626" }}>Request Withdrawal</Button>
              </div>
            )}
          </div>

          {!bankStore && (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>Select a store to view bank details</div>
          )}

          {bankStore && (
            <>
              {/* Bank Account Card */}
              {bankAccountQuery.isLoading && <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>}
              {bankAccountQuery.data && (() => {
                const acct = bankAccountQuery.data;
                return (
                  <Card
                    style={{ marginBottom: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #0891b2" }}
                    bodyStyle={{ padding: "16px 20px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <BankOutlined style={{ fontSize: 20, color: "#0891b2" }} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{acct.accountName}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{acct.bankName} — {acct.branchName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Current Balance</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>{fmt(acct.currentBalance)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      {[
                        ["Account No.", acct.accountNumber],
                        ["IFSC",        acct.ifscCode],
                        ["Type",        acct.accountType || "—"],
                        ["Opening Bal.",fmt(acct.openingBalance)],
                        ["Status",      acct.status],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {acct.notes && <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>📝 {acct.notes}</div>}
                  </Card>
                );
              })()}
              {!bankAccountQuery.isLoading && !bankAccountQuery.data && (
                <Alert type="info" message="No bank account configured for this store." style={{ marginBottom: 16 }}
                  action={<Button size="small" onClick={() => { bankAccountForm.setFieldsValue({ storeId: bankStore }); setBankAccountModal(true); }}>Add Now</Button>}
                />
              )}

              {/* Pending Withdrawals */}
              {(pendingWithdrawalsQuery.data || []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>⏳ Pending Withdrawals</div>
                  <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      dataSource={pendingWithdrawalsQuery.data || []}
                      columns={[
                        { title: "Amount",      dataIndex: "amount",      key: "amount",  align: "right" as const, render: fmt },
                        { title: "Description", dataIndex: "description", key: "desc",    render: (v: string) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v}</span> },
                        { title: "Requested",   dataIndex: "createdAt",   key: "date",    render: (v: string) => new Date(v).toLocaleString("en-IN") },
                        { title: "Status",      dataIndex: "status",      key: "status",  render: () => <Tag color="orange">PENDING</Tag> },
                        {
                          title: "Actions", key: "actions", align: "center" as const,
                          render: (_: any, r: any) => (
                            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                              <Button size="small" type="primary" style={{ background: "#059669" }}
                                loading={approveWithdrawalMutation.isPending}
                                onClick={() => approveWithdrawalMutation.mutate(r.id)}>Approve</Button>
                              <Button size="small" danger onClick={() => setRejectWithdrawalModal(r)}>Reject</Button>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* Bank Transactions */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Bank Transactions</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <DatePicker placeholder="Start date" onChange={(_, s) => { setBankTxnStart(s as string); setBankTxnPage(1); }} format="YYYY-MM-DD" style={{ width: 150 }} allowClear />
                <DatePicker placeholder="End date"   onChange={(_, s) => { setBankTxnEnd(s as string);   setBankTxnPage(1); }} format="YYYY-MM-DD" style={{ width: 150 }} allowClear />
              </div>
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table
                  rowKey="id"
                  loading={bankTxnQuery.isLoading || bankTxnQuery.isFetching}
                  dataSource={bankTxnQuery.data?.result || []}
                  scroll={{ x: true }}
                  size="middle"
                  pagination={{ current: bankTxnPage, pageSize: 15, total: bankTxnQuery.data?.total || 0, onChange: setBankTxnPage, showSizeChanger: false }}
                  columns={[
                    {
                      title: "Type", dataIndex: "type", key: "type",
                      render: (v: string) => {
                        const color = v === "DEPOSIT" ? "green" : v === "WITHDRAWAL" ? "red" : v === "TRANSFER_IN" ? "cyan" : "orange";
                        return <Tag color={color}>{v?.replace(/_/g, " ")}</Tag>;
                      },
                    },
                    { title: "Amount",      dataIndex: "amount",       key: "amount",  align: "right" as const, render: fmt },
                    { title: "Balance After", dataIndex: "balanceAfter", key: "bal",   align: "right" as const, render: (v: any) => v != null ? <span style={{ fontWeight: 600, color: "#059669" }}>{fmt(v)}</span> : "—" },
                    { title: "Description", dataIndex: "description",  key: "desc",   render: (v: string) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v || "—"}</span> },
                    {
                      title: "Status", dataIndex: "status", key: "status",
                      render: (v: string) => <Tag color={v === "COMPLETED" ? "green" : "orange"}>{v}</Tag>,
                    },
                    { title: "Date", dataIndex: "createdAt", key: "date", render: (v: string) => new Date(v).toLocaleString("en-IN") },
                  ]}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* ── Open Drawer Modal ── */}
      <Modal open={openDrawerModal} title={<><UnlockOutlined /> Open Cash Drawer</>} onCancel={() => setOpenDrawerModal(false)} footer={null}>
        <Form form={openForm} layout="vertical" onFinish={v => openMutation.mutate(v)}>
          <Form.Item name="storeId" label="Store" rules={[{ required: true }]}>
            <Select options={storeOptions.filter(s => s.value)} placeholder="Select store" onChange={() => qc.invalidateQueries({ queryKey: ["available-cashiers"] })} />
          </Form.Item>
          <Form.Item name="cashierId" label="Cashier" rules={[{ required: true }]}>
            <Select
              loading={cashiersQuery.isLoading}
              placeholder="Select cashier"
              options={(cashiersQuery.data || []).map((c: any) => ({ value: c.id, label: `${c.name} — ${c.store?.name || ""}` }))}
            />
          </Form.Item>
          <Form.Item name="openingAmount" label="Opening Amount" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={openMutation.isPending} block style={{ background: "#2563eb" }}>Open Drawer</Button>
        </Form>
      </Modal>

      {/* ── Close Drawer Modal ── */}
      <Modal open={!!closeDrawerModal} title={<><LockOutlined /> Close Drawer</>} onCancel={() => setCloseDrawerModal(null)} footer={null}>
        {closeDrawerModal && (
          <div style={{ marginBottom: 16, background: "#f8fafc", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Cashier: <strong>{closeDrawerModal.cashier?.name}</strong></div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Balance: <strong style={{ color: "#059669" }}>{fmt(closeDrawerModal.currentBalance ?? closeDrawerModal.summary?.currentBalance)}</strong></div>
          </div>
        )}
        <Form form={closeForm} layout="vertical" onFinish={v => closeMutation.mutate({ id: closeDrawerModal?.id, ...v })}>
          <Form.Item name="actualCountedAmount" label="Actual Counted Amount" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" danger htmlType="submit" loading={closeMutation.isPending} block>Close Drawer</Button>
        </Form>
      </Modal>

      {/* ── Add Cash Modal ── */}
      <Modal open={!!addCashModal} title={<><PlusOutlined /> Add Cash</>} onCancel={() => setAddCashModal(null)} footer={null}>
        <Form form={addCashForm} layout="vertical" onFinish={v => addCashMutation.mutate({ cashDrawerId: addCashModal?.id, ...v })}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addCashMutation.isPending} block style={{ background: "#059669" }}>Add Cash</Button>
        </Form>
      </Modal>

      {/* ── Transfer Modal ── */}
      <Modal open={transferModal} title={<><SwapOutlined /> Transfer Cash Between Drawers</>} onCancel={() => { setTransferModal(false); transferForm.resetFields(); }} footer={null}>
        <Form form={transferForm} layout="vertical" onFinish={v => transferMutation.mutate(v)}>
          <Form.Item name="fromDrawerId" label="From Drawer ID" rules={[{ required: true }]}><Input placeholder="Enter drawer ID" /></Form.Item>
          <Form.Item name="toDrawerId"   label="To Drawer ID"   rules={[{ required: true }]}><Input placeholder="Enter drawer ID" /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={transferMutation.isPending} block style={{ background: "#0891b2" }}>Transfer</Button>
        </Form>
      </Modal>

      {/* ── Bank Account Modal ── */}
      <Modal open={bankAccountModal} title={<><BankOutlined /> {bankAccountQuery.data ? "Edit" : "Add"} Bank Account</>} onCancel={() => { setBankAccountModal(false); bankAccountForm.resetFields(); }} footer={null}>
        <Form form={bankAccountForm} layout="vertical" onFinish={v => saveBankAccountMutation.mutate({ storeId: bankStore, ...v })}>
          <Form.Item name="accountName"   label="Account Name"   rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accountNumber" label="Account Number" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="bankName"      label="Bank Name"      rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="ifscCode"      label="IFSC Code"      rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="branchName"    label="Branch Name"><Input /></Form.Item>
          <Form.Item name="notes"         label="Notes"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saveBankAccountMutation.isPending} block style={{ background: "#0891b2" }}>
            {bankAccountQuery.data ? "Update Account" : "Save Account"}
          </Button>
        </Form>
      </Modal>

      {/* ── Bank Transfer Modal ── */}
      <Modal open={bankTransferModal} title={<><SwapOutlined /> Bank Transfer Between Stores</>} onCancel={() => { setBankTransferModal(false); bankTransferForm.resetFields(); }} footer={null}>
        <Form form={bankTransferForm} layout="vertical" onFinish={v => bankTransferMutation.mutate(v)}>
          <Form.Item name="fromStoreId" label="From Store" rules={[{ required: true }]}>
            <Select loading={storesQuery.isLoading} options={storeOptions.filter(s => s.value)} placeholder="Select store" />
          </Form.Item>
          <Form.Item name="toStoreId" label="To Store" rules={[{ required: true }]}>
            <Select loading={storesQuery.isLoading} options={storeOptions.filter(s => s.value)} placeholder="Select store" />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={bankTransferMutation.isPending} block style={{ background: "#0891b2" }}>Transfer</Button>
        </Form>
      </Modal>

      {/* ── Withdrawal Request Modal ── */}
      <Modal open={withdrawalModal} title="Request Bank Withdrawal" onCancel={() => { setWithdrawalModal(false); withdrawalForm.resetFields(); }} footer={null}>
        <Form form={withdrawalForm} layout="vertical" onFinish={v => withdrawalRequestMutation.mutate(v)}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Button type="primary" danger htmlType="submit" loading={withdrawalRequestMutation.isPending} block>Request Withdrawal</Button>
        </Form>
      </Modal>

      {/* ── Reject Withdrawal Modal ── */}
      <Modal open={!!rejectWithdrawalModal} title="Reject Withdrawal" onCancel={() => { setRejectWithdrawalModal(null); rejectWithdrawalForm.resetFields(); }} footer={null}>
        {rejectWithdrawalModal && (
          <div style={{ marginBottom: 12, background: "#fef2f2", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Amount: <strong style={{ color: "#dc2626" }}>{fmt(rejectWithdrawalModal.amount)}</strong></div>
          </div>
        )}
        <Form form={rejectWithdrawalForm} layout="vertical" onFinish={v => rejectWithdrawalMutation.mutate({ id: rejectWithdrawalModal?.id, reason: v.reason })}>
          <Form.Item name="reason" label="Rejection Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Enter reason..." />
          </Form.Item>
          <Button type="primary" danger htmlType="submit" loading={rejectWithdrawalMutation.isPending} block>Reject</Button>
        </Form>
      </Modal>

      {/* ── Drawer Detail Modal ── */}
      <Modal open={!!viewDrawer} title="Drawer Details" onCancel={() => setViewDrawer(null)} width={700}
        footer={<Button onClick={() => setViewDrawer(null)}>Close</Button>}
      >
        {drawerDetailQuery.isLoading && <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>}
        {drawerDetailQuery.data && (() => {
          const d = drawerDetailQuery.data;
          const drawer  = d.drawer  || d;
          const summary = d.summary || {};
          return (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>👤 Cashier</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{drawer.cashier?.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{drawer.store?.name}</div>
                  <Tag color={drawer.isOpen ? "green" : "default"} style={{ marginTop: 4 }}>{drawer.isOpen ? "OPEN" : "CLOSED"}</Tag>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>💰 Summary</div>
                  {[
                    ["Opening",  fmt(summary.openingAmount)],
                    ["Sales",    fmt(summary.totalSales)],
                    ["Cash In",  fmt(summary.totalCashIn)],
                    ["Cash Out", fmt(summary.totalCashOut)],
                    ["Balance",  fmt(summary.currentCashAmount ?? summary.currentBalance)],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                      <span style={{ color: "#6b7280" }}>{l}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {d.paymentBreakdown && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Payment Breakdown</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["CASH", "UPI", "CARD"].filter(m => d.paymentBreakdown[m]).map(m => (
                      <div key={m} style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                        <Tag color={m === "CASH" ? "green" : m === "UPI" ? "gold" : "red"}>{m}</Tag>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{fmt(d.paymentBreakdown[m]?.amount)}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{d.paymentBreakdown[m]?.count} txns</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(d.transactions || drawer.transactions || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Transactions</div>
                  <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["Type", "Method", "Amount", "Description", "Time"].map(h => (
                            <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(d.transactions || drawer.transactions || []).map((t: any) => (
                          <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "6px 10px" }}><Tag style={{ fontSize: 10 }}>{t.type}</Tag></td>
                            <td style={{ padding: "6px 10px" }}>{t.paymentMethod || "—"}</td>
                            <td style={{ padding: "6px 10px", fontWeight: 600 }}>{fmt(t.amount)}</td>
                            <td style={{ padding: "6px 10px", color: "#6b7280", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                            <td style={{ padding: "6px 10px", color: "#9ca3af" }}>{new Date(t.createdAt).toLocaleTimeString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
      <ShortcutHelp shortcuts={[
        { key: "1",     label: "Dashboard tab" },
        { key: "2",     label: "Drawers tab" },
        { key: "3",     label: "Cash-Out tab" },
        { key: "4",     label: "Transfers tab" },
        { key: "5",     label: "Bank tab" },
        { key: "P",     label: "Cash-Out → Pending" },
        { key: "H",     label: "Cash-Out → History" },
        { key: "N",     label: "New Transfer (in Transfers tab)" },
        { key: "Alt+O", label: "Open Drawer" },
        { key: "Alt+T", label: "Transfer Cash" },
      ]} />

      {/* ── Reject Cash-Out Modal ── */}
      <Modal open={!!rejectModal} title="Reject Cash-Out Request" onCancel={() => setRejectModal(null)} footer={null}>
        {rejectModal && (
          <div style={{ marginBottom: 12, background: "#fef2f2", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Requester: <strong>{rejectModal.requester?.name}</strong></div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Amount: <strong style={{ color: "#dc2626" }}>{fmt(rejectModal.amount)}</strong></div>
          </div>
        )}
        <Form form={rejectForm} layout="vertical" onFinish={v => rejectMutation.mutate({ id: rejectModal?.id, reason: v.reason })}>
          <Form.Item name="reason" label="Rejection Reason" rules={[{ required: true, message: "Please enter a reason" }]}>
            <Input.TextArea rows={3} placeholder="Enter reason for rejection..." />
          </Form.Item>
          <Button type="primary" danger htmlType="submit" loading={rejectMutation.isPending} block>Reject Request</Button>
        </Form>
      </Modal>
    </div>
  );
}
