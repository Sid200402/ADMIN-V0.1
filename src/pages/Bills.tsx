import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Table, Tag, Button, Input, Select, DatePicker, Modal,
  Tooltip, Spin, Alert, Typography,
} from "antd";
import { EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { billsService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const { Text } = Typography;

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "",          label: "All Status" },
  { value: "PAID",      label: "PAID" },
  { value: "DUE",       label: "DUE" },
  { value: "HOLD",      label: "HOLD" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "RETURNED",  label: "RETURNED" },
];

const STATUS_COLOR: Record<string, string> = {
  PAID:      "green",
  DUE:       "orange",
  HOLD:      "blue",
  CANCELLED: "red",
  RETURNED:  "purple",
};

const PAYMENT_COLOR: Record<string, string> = {
  CASH: "green",
  UPI:  "gold",
  CARD: "red",
};

const PAYMENT_ORDER = ["CASH", "UPI", "CARD"];

// Group & sum payments by method, sorted CASH → UPI → CARD → others
const groupPayments = (payments: any[]) => {
  const map: Record<string, number> = {};
  (payments || []).forEach((p) => {
    map[p.paymentMethod] = (map[p.paymentMethod] || 0) + parseFloat(p.amount ?? 0);
  });
  const ordered = PAYMENT_ORDER.filter((m) => map[m]).map((m) => ({ method: m, amount: map[m] }));
  const others  = Object.keys(map).filter((m) => !PAYMENT_ORDER.includes(m)).map((m) => ({ method: m, amount: map[m] }));
  return [...ordered, ...others];
};

const fmt = (v: any) => `₹${parseFloat(v ?? 0).toFixed(2)}`;

// ── API fetchers ──────────────────────────────────────────────────────────────
const fetchBills = async (params: { limit: number; offset: number; keyword?: string; status?: string; date?: string }) => {
  const { data } = await billsService.getAll(params);
  return data;
};

const fetchBillById = async (id: string) => {
  const { data } = await billsService.getById(id);
  return data;
};

// ── Bills Page ────────────────────────────────────────────────────────────────
export default function Bills() {
  const [page, setPage]         = useState(1);
  const [limit]                 = useState(10);
  const [keyword, setKeyword]   = useState("");
  const [status, setStatus]     = useState("");
  const [date, setDate]         = useState("");
  const [viewId, setViewId]     = useState<string | null>(null);

  // debounce keyword
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = useCallback((val: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
    }, 500);
  }, []);

  const offset = (page - 1) * limit;

  // ── Bills list query ────────────────────────────────────────────────────────
  const billsQuery = useQuery({
    queryKey: ["bills", limit, offset, keyword, status, date],
    queryFn: () => fetchBills({ limit, offset, keyword, status, date }),
    staleTime: 30_000,
  });

  // ── Bill detail query ───────────────────────────────────────────────────────
  const detailQuery = useQuery({
    queryKey: ["bill-detail", viewId],
    queryFn: () => fetchBillById(viewId!),
    enabled: !!viewId,
    staleTime: 0,
  });

  const bills = billsQuery.data?.result || billsQuery.data?.data?.result || [];
  const total = billsQuery.data?.total  || billsQuery.data?.data?.total  || 0;
  const bill  = detailQuery.data?.data  || detailQuery.data;

  const kbdRow: React.CSSProperties = {
    background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3,
    padding: "0 4px", fontFamily: "monospace", fontSize: 10, color: "#475569",
    lineHeight: "16px", display: "inline-block",
  };

  const { rowClassName, onRow, focusedId } = usePageShortcuts({
    onNew: () => {},
    isModalOpen: !!viewId,
    onCloseModal: () => setViewId(null),
    items: bills,
    isFetching: billsQuery.isFetching,
  });

  // V = view focused row
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable ||
        document.body.classList.contains("sidebar-focused");
      if (isInput || !!viewId) return;
      const row = focusedId ? bills.find((r: any) => r.id === focusedId) : null;
      if (!row) return;
      if (e.key === "v" || e.key === "V") { e.preventDefault(); setViewId(row.id); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [viewId, focusedId, bills]);

  // ── Table columns ───────────────────────────────────────────────────────────
  const columns: ColumnType<any>[] = [
    {
      title: "Bill No.",
      dataIndex: "billNumber",
      key: "billNumber",
      render: (v: string) => <Text strong style={{ color: "#2563eb" }}>{v}</Text>,
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    },
    {
      title: "Store",
      key: "store",
      render: (_: any, row: any) => row.store?.name || "—",
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, row: any) => row.customer?.name || <Text type="secondary">Walk-in</Text>,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right" as const,
      render: fmt,
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      align: "right" as const,
      render: (v: any) => <Text style={{ color: "#059669" }}>{fmt(v)}</Text>,
    },
    {
      title: "Due",
      dataIndex: "dueAmount",
      key: "dueAmount",
      align: "right" as const,
      render: (v: any) => <Text style={{ color: parseFloat(v) > 0 ? "#dc2626" : "#059669" }}>{fmt(v)}</Text>,
    },
    {
      title: "Payment",
      key: "payments",
      render: (_: any, row: any) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {groupPayments(row.payments).map(({ method, amount }) => (
            <Tag key={method} color={PAYMENT_COLOR[method] || "default"} style={{ fontSize: 11, margin: 0 }}>
              {method}: ₹{amount.toFixed(2)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      align: "center" as const,
      render: (_: any, row: any) => (
        <Tooltip title="View Details">
          <Button type="primary" size="small" icon={<EyeOutlined />}
            onClick={() => setViewId(row.id)} style={{ background: "#2563eb" }}>
            <kbd style={{ ...kbdRow, background: "rgba(255,255,255,0.2)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>V</kbd>
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Bills</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage all sales bills and invoices</div>
        </div>
        <Tag color="blue" style={{ fontSize: 13, padding: "4px 12px" }}>
          Total: {total}
        </Tag>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          placeholder="Search bill no. or customer..."
          onChange={e => handleSearch(e.target.value)}
          style={{ width: 260, borderRadius: 8 }}
          allowClear
        />
        <Select
          value={status}
          onChange={v => { setStatus(v); setPage(1); }}
          options={STATUS_OPTIONS}
          style={{ width: 150 }}
          placeholder="All Status"
        />
        <DatePicker
          onChange={(_, s) => { setDate(s as string); setPage(1); }}
          format="YYYY-MM-DD"
          placeholder="Filter by date"
          style={{ width: 160 }}
          allowClear
        />
        {(keyword || status || date) && (
          <Button onClick={() => { setKeyword(""); setStatus(""); setDate(""); setPage(1); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* ── Error ── */}
      {billsQuery.isError && (
        <Alert type="error" message="Failed to load bills." className="mb-4" />
      )}

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={bills}
          rowKey="id"
          loading={billsQuery.isLoading || billsQuery.isFetching}
          scroll={{ x: true }}
          size="middle"
          rowClassName={rowClassName}
          onRow={onRow}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `Total ${t} bills`,
          }}
        />
      </div>

      {/* ── Bill Detail Modal ── */}
      <Modal
        open={!!viewId}
        onCancel={() => setViewId(null)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Bill Details</span>
            {bill && <Tag color={STATUS_COLOR[bill.status] || "default"}>{bill.status}</Tag>}
          </div>
        }
        width={780}
        footer={<Button onClick={() => setViewId(null)}>Close</Button>}
      >
        {detailQuery.isLoading && <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>}
        {detailQuery.isError && <Alert type="error" message="Failed to load bill details." />}

        {bill && (
          <div>
            {/* Bill info row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                ["Bill Number", bill.billNumber],
                ["Date", new Date(bill.createdAt).toLocaleString("en-IN")],
                ["Staff", bill.staff?.name || "—"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Store + Customer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>🏪 Store</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{bill.store?.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{bill.store?.address}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{bill.store?.phone}</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>👤 Customer</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{bill.customer?.name || "Walk-in Customer"}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{bill.customer?.phone}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{bill.customer?.email}</div>
              </div>
            </div>

            {/* Items table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Items</div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Product", "SKU", "Qty", "Unit Price", "Tax", "Discount", "Total"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Product" || h === "SKU" ? "left" : "right", fontWeight: 700, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(bill.items || []).map((item: any, i: number) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.product?.name}</td>
                        <td style={{ padding: "8px 12px", color: "#6b7280" }}>{item.product?.sku}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.quantity}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#0891b2" }}>{fmt(item.tax ?? 0)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#dc2626" }}>{fmt(item.discount ?? 0)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals + Payments */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Totals */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Summary</div>
                {[
                  ["Subtotal",  fmt(bill.subtotal),       "#111827"],
                  ["Tax",       fmt(bill.taxAmount),      "#0891b2"],
                  ["Discount",  fmt(bill.discountAmount), "#dc2626"],
                  ["Total",     fmt(bill.total),          "#111827"],
                  ["Paid",      fmt(bill.paidAmount),     "#059669"],
                  ["Due",       fmt(bill.dueAmount),      parseFloat(bill.dueAmount) > 0 ? "#dc2626" : "#059669"],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: label === "Discount" ? "1px solid #e5e7eb" : "none" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: label === "Total" || label === "Due" ? 700 : 500, color: color as string }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Payments */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Payments</div>
                {(bill.payments || []).length === 0
                  ? <div style={{ fontSize: 12, color: "#9ca3af" }}>No payments recorded</div>
                  : groupPayments(bill.payments).map(({ method, amount }) => (
                    <div key={method} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #e5e7eb" }}>
                      <Tag color={PAYMENT_COLOR[method] || "default"} style={{ fontSize: 11 }}>{method}</Tag>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>₹{amount.toFixed(2)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Notes */}
            {bill.notes && (
              <div style={{ marginTop: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
                <strong>Notes:</strong> {bill.notes}
              </div>
            )}
          </div>
        )}
      </Modal>
      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "V",      label: "View bill details" },
        { key: "Alt+S",  label: "Focus search" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
