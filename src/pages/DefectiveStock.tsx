import React, { useState, useEffect } from "react";
import { Table, Button, Tag, Tooltip, message, Modal, Tabs, Alert, Popconfirm } from "antd";
import { CheckOutlined, CloseOutlined, EyeOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { defectiveStockService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import ShortcutHelp from "../components/ShortcutHelp";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d97706",
  APPROVED: "#059669",
  REJECTED: "#dc2626",
};

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Each API row is a defect REPORT with items[]. Flatten for display.
function flattenItems(reports: any[]): any[] {
  const rows: any[] = [];
  for (const report of reports) {
    const reportItems: any[] = report.items || [];
    if (reportItems.length === 0) {
      rows.push({ ...report, _product: null, _qty: null, _note: null });
    } else {
      reportItems.forEach((item) => {
        rows.push({
          ...report,
          _rowKey: item.id,
          _product: item.product,
          _qty: item.quantity,
          _note: item.note,
        });
      });
    }
  }
  return rows;
}

export default function DefectiveStock() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [viewItem, setViewItem] = useState<any>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const kbdRow: React.CSSProperties = {
    background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3,
    padding: "0 4px", fontFamily: "monospace", fontSize: 10, color: "#475569",
    lineHeight: "16px", display: "inline-block",
  };

  const pendingQuery = useQuery({
    queryKey: ["defective-pending"],
    queryFn: () => defectiveStockService.getPending().then((r) => r.data),
    enabled: activeTab === "pending",
    staleTime: 30_000,
  });

  const stockQuery = useQuery({
    queryKey: ["defective-stock"],
    queryFn: () => defectiveStockService.getDefectiveStock().then((r) => r.data),
    enabled: activeTab === "stock",
    staleTime: 30_000,
  });

  const vendorReturnQuery = useQuery({
    queryKey: ["defective-vendor-return"],
    queryFn: () => defectiveStockService.getVendorReturn().then((r) => r.data),
    enabled: activeTab === "vendor-return",
    staleTime: 30_000,
  });

  const vendorReturnHistoryQuery = useQuery({
    queryKey: ["defective-vendor-return-history"],
    queryFn: () => defectiveStockService.getVendorReturnHistory().then((r) => r.data),
    enabled: activeTab === "vendor-return-history",
    staleTime: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: ["defective-history"],
    queryFn: () => defectiveStockService.getHistory().then((r) => r.data),
    enabled: activeTab === "history",
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["defective-pending"] });
    qc.invalidateQueries({ queryKey: ["defective-stock"] });
    qc.invalidateQueries({ queryKey: ["defective-history"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => defectiveStockService.approve(id),
    onSuccess: () => { message.success("Approved"); invalidate(); },
    onError: () => message.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => defectiveStockService.reject(id),
    onSuccess: () => { message.success("Rejected"); invalidate(); },
    onError: () => message.error("Failed to reject"),
  });

  const getList = (query: any) => flattenItems(query.data?.result || query.data || []);

  // keyboard shortcuts — placed after all queries
  useEffect(() => {
    const pendingData = pendingQuery.data;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable ||
        document.body.classList.contains("sidebar-focused");
      if (isInput || !!viewItem) return;
      if (e.key === "1") { e.preventDefault(); setActiveTab("pending"); return; }
      if (e.key === "2") { e.preventDefault(); setActiveTab("stock"); return; }
      if (e.key === "3") { e.preventDefault(); setActiveTab("vendor-return"); return; }
      if (e.key === "4") { e.preventDefault(); setActiveTab("vendor-return-history"); return; }
      if (e.key === "5") { e.preventDefault(); setActiveTab("history"); return; }
      if (e.key === "Escape") { setFocusedId(null); return; }
      const pendingList = flattenItems(pendingData?.result || pendingData || []);
      const row = focusedId ? pendingList.find((r: any) => (r._rowKey || r.id) === focusedId) : null;
      if (!row) return;
      if (e.key === "v" || e.key === "V") { e.preventDefault(); setViewItem(row); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [viewItem, focusedId, pendingQuery.data]);

  // ── Product cell (reads from flattened _product) ──────────────────────────
  const productCell = (_: any, r: any) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {r._product?.imageUrl && (
        <img src={r._product.imageUrl} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
      )}
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{r._product?.name || "—"}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{r._product?.sku}</div>
      </div>
    </div>
  );

  // ── Shared columns ────────────────────────────────────────────────────────
  const sharedCols: ColumnType<any>[] = [
    { title: "Product", key: "product", render: productCell },
    { title: "Store",   key: "store",   width: 180, render: (_: any, r: any) => r.store?.name || "—" },
    { title: "Qty",     key: "qty",     align: "center" as const, width: 60,
      render: (_: any, r: any) => r._qty ?? "—" },
    { title: "Reason",  dataIndex: "reason", key: "reason", width: 160,
      render: (v: string) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v || "—"}</span> },
    { title: "Note",    key: "note",    width: 140,
      render: (_: any, r: any) => <span style={{ fontSize: 12, color: "#6b7280" }}>{r._note || "—"}</span> },
    { title: "Status",  key: "status",  align: "center" as const, width: 100,
      render: (_: any, r: any) => (
        <Tag style={{ background: STATUS_COLOR[r.status] || "#6b7280", color: "#fff", border: "none" }}>
          {r.status || "—"}
        </Tag>
      ),
    },
    { title: "Date", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
  ];

  const pendingColumns: ColumnType<any>[] = [
    ...sharedCols,
    {
      title: "Actions", key: "actions", align: "center" as const, width: 160,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setViewItem(r)}><kbd style={kbdRow}>V</kbd></Button></Tooltip>
          <Popconfirm title="Approve this report?" onConfirm={() => approveMutation.mutate(r.id)} okText="Yes" cancelText="No">
            <Tooltip title="Approve">
              <Button size="small" icon={<CheckOutlined />} style={{ color: "#059669", borderColor: "#059669" }}
                loading={approveMutation.isPending}><kbd style={kbdRow}>A</kbd></Button>
            </Tooltip>
          </Popconfirm>
          <Popconfirm title="Reject this report?" onConfirm={() => rejectMutation.mutate(r.id)} okText="Yes" cancelText="No">
            <Tooltip title="Reject">
              <Button size="small" icon={<CloseOutlined />} danger loading={rejectMutation.isPending}><kbd style={kbdRow}>X</kbd></Button>
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const readonlyColumns: ColumnType<any>[] = [
    ...sharedCols,
    { title: "View", key: "view", align: "center" as const, width: 80,
      render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => setViewItem(r)}><kbd style={kbdRow}>V</kbd></Button>,
    },
  ];

  const renderTable = (query: any, cols: ColumnType<any>[]) => (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      {query.isError && <Alert type="error" message="Failed to load data." style={{ margin: 16 }} />}
      <Table
        columns={cols}
        dataSource={getList(query)}
        rowKey={(r) => r._rowKey || r.id}
        loading={query.isFetching}
        size="middle"
        scroll={{ x: "max-content" }}
        pagination={{ pageSize: 10, showTotal: (t: number) => `Total ${t}` }}
        rowClassName={(r) => (r._rowKey || r.id) === focusedId ? "page-row-focused" : ""}
        onRow={(r) => ({ onClick: () => setFocusedId(r._rowKey || r.id) })}
      />
    </div>
  );

  const pendingCount = (pendingQuery.data?.result || pendingQuery.data || []).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Defective Stock</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage defective items, approvals and vendor returns</div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "pending",
            label: (
              <span>
                Pending{pendingCount > 0 && (
                  <Tag style={{ marginLeft: 6, background: "#dc2626", color: "#fff", border: "none", fontSize: 11 }}>
                    {pendingCount}
                  </Tag>
                )}
              </span>
            ),
            children: renderTable(pendingQuery, pendingColumns),
          },
          { key: "stock",                label: "Defective Stock",       children: renderTable(stockQuery,              readonlyColumns) },
          { key: "vendor-return",        label: "Vendor Return",         children: renderTable(vendorReturnQuery,       readonlyColumns) },
          { key: "vendor-return-history",label: "Vendor Return History", children: renderTable(vendorReturnHistoryQuery,readonlyColumns) },
          { key: "history",              label: "Full History",          children: renderTable(historyQuery,            readonlyColumns) },
        ]}
      />

      {/* View Detail Modal */}
      <Modal
        open={!!viewItem}
        title="Defective Report Details"
        width={560}
        footer={<Button onClick={() => setViewItem(null)}>Close</Button>}
        onCancel={() => setViewItem(null)}
      >
        {viewItem && (
          <div>
            {[
              ["Product",    viewItem._product?.name || "—"],
              ["SKU",        viewItem._product?.sku  || "—"],
              ["Store",      viewItem.store?.name    || "—"],
              ["Quantity",   viewItem._qty           ?? "—"],
              ["Reason",     viewItem.reason         || "—"],
              ["Note",       viewItem._note          || "—"],
              ["Status",     viewItem.status         || "—"],
              ["Admin Note", viewItem.adminNote      || "—"],
              ["Approved By",viewItem.approvedBy     || "—"],
              ["Reported",   fmtDate(viewItem.createdAt)],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{String(val)}</span>
              </div>
            ))}

            {/* All items in this report */}
            {(viewItem.items || []).length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>All Items in Report</div>
                {viewItem.items.map((item: any) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    {item.product?.imageUrl && (
                      <img src={item.product.imageUrl} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.product?.name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.product?.sku}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Qty: <strong>{item.quantity}</strong></div>
                    {item.note && <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
      <ShortcutHelp shortcuts={[
        { key: "1–5",   label: "Switch tabs" },
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "V",      label: "View details" },
        { key: "Esc",    label: "Clear selection" },
      ]} />
    </div>
  );
}
