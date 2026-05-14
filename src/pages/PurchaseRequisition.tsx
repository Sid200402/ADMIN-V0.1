import React, { useState, useEffect } from "react";
import {
  Table, Button, Select, Tag, Tooltip, message, Modal, Tabs,
  Alert, Popconfirm, Form, InputNumber, Input, DatePicker, Space,
} from "antd";
import {
  CheckOutlined, DeleteOutlined, EyeOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { purchaseRequisitionService, storeService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d97706",
  PURCHASED: "#059669",
  PARTIALLY_PURCHASED: "#2563eb",
  REMOVED: "#dc2626",
};

const STOCK_STATUS_COLOR: Record<string, string> = {
  LOW_STOCK: "#d97706",
  OUT_OF_STOCK: "#dc2626",
};

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtCurrency = (v: number | null) =>
  v != null ? `₹${Number(v).toFixed(2)}` : "—";

export default function PurchaseRequisition() {
  const qc = useQueryClient();
  const [storeId, setStoreId] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [viewItem, setViewItem] = useState<any>(null);
  const [purchaseModal, setPurchaseModal] = useState<any>(null);
  const [removeModal, setRemoveModal] = useState<any>(null);
  const [filters, setFilters] = useState<{ status?: string; stockStatus?: string }>({});
  const [reportDates, setReportDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [purchaseForm] = Form.useForm();
  const [removeForm] = Form.useForm();

  const storesQuery = useQuery({
    queryKey: ["stores-active"],
    queryFn: () => storeService.search().then((r: any) => r || []),
    staleTime: 300_000,
  });
  const stores: any[] = storesQuery.data || [];
  const storeMap = Object.fromEntries(stores.map((s: any) => [s.id, s.name]));

  useEffect(() => {
    if (stores.length && !storeId) {
      const def = stores.find((s: any) => s.defaultStore) || stores[0];
      if (def) setStoreId(def.id);
    }
  }, [stores]);

  const listQuery = useQuery({
    queryKey: ["req-list", storeId, filters],
    queryFn: () =>
      purchaseRequisitionService.getList({ storeId, ...filters, limit: 100 }).then((r) => r.data),
    enabled: !!storeId,
    staleTime: 30_000,
  });

  const reportQuery = useQuery({
    queryKey: ["req-report-purchased", storeId, reportDates],
    queryFn: () =>
      purchaseRequisitionService.reportPurchased({ storeId, ...reportDates, limit: 100 }).then((r) => r.data),
    enabled: !!storeId && activeTab === "report",
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["req-list", storeId] });
    qc.invalidateQueries({ queryKey: ["req-report-purchased", storeId] });
  };

  const markPurchasedMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      purchaseRequisitionService.markPurchased(id, body),
    onSuccess: () => {
      message.success("Marked as purchased");
      setPurchaseModal(null);
      purchaseForm.resetFields();
      invalidate();
    },
    onError: () => message.error("Failed to update"),
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      purchaseRequisitionService.remove(id, reason),
    onSuccess: () => {
      message.success("Requisition removed");
      setRemoveModal(null);
      removeForm.resetFields();
      invalidate();
    },
    onError: () => message.error("Failed to remove"),
  });

  const anyModalOpen = !!viewItem || !!purchaseModal || !!removeModal;
  const items: any[] = listQuery.data?.result || [];
  const { rowClassName, onRow, focusedId } = usePageShortcuts({
    onNew: () => {},
    isModalOpen: anyModalOpen,
    onCloseModal: () => { setViewItem(null); setPurchaseModal(null); setRemoveModal(null); },
    onEdit: (r) => { setPurchaseModal(r); purchaseForm.setFieldsValue({ purchasedQuantity: r.requiredQuantity, pricePerUnit: r.pricePerUnit }); },
    items,
    isFetching: listQuery.isFetching,
  });

  // extra row shortcuts: V=view
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable ||
        document.body.classList.contains("sidebar-focused");
      if (isInput || anyModalOpen) return;
      const row = focusedId ? items.find((r: any) => r.id === focusedId) : null;
      if (!row) return;
      if (e.key === "v" || e.key === "V") { e.preventDefault(); setViewItem(row); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [anyModalOpen, focusedId, items]);

  const kbdRow: React.CSSProperties = {
    background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3,
    padding: "0 4px", fontFamily: "monospace", fontSize: 10, color: "#475569",
    lineHeight: "16px", display: "inline-block",
  };

  const actionButtons = (r: any) => (
    <Space size={4}>
      <Tooltip title="View">
        <Button size="small" icon={<EyeOutlined />} onClick={() => setViewItem(r)}><kbd style={kbdRow}>V</kbd></Button>
      </Tooltip>
      {r.status !== "PURCHASED" && r.status !== "REMOVED" && (
        <Tooltip title="Mark Purchased">
          <Button size="small" icon={<CheckOutlined />} style={{ color: "#059669", borderColor: "#059669" }}
            onClick={() => { setPurchaseModal(r); purchaseForm.setFieldsValue({ purchasedQuantity: r.requiredQuantity, pricePerUnit: r.pricePerUnit }); }}>
            <kbd style={kbdRow}>E</kbd>
          </Button>
        </Tooltip>
      )}
      {r.status !== "REMOVED" && (
        <Tooltip title="Remove">
          <Popconfirm
            title={
              <Form form={removeForm} layout="vertical" style={{ width: 260, marginTop: 8 }}>
                <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Required" }]}>
                  <Input.TextArea rows={2} placeholder="Reason for removal" />
                </Form.Item>
              </Form>
            }
            onConfirm={() =>
              removeForm.validateFields().then((vals) =>
                removeMutation.mutate({ id: r.id, reason: vals.reason })
              )
            }
            okText="Remove"
            okButtonProps={{ danger: true, loading: removeMutation.isPending }}
            onOpenChange={(open) => { if (!open) removeForm.resetFields(); }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Tooltip>
      )}
    </Space>
  );

  const columns: ColumnType<any>[] = [
    {
      title: "Product", key: "product",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.product?.name || "—"}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.product?.sku}</div>
        </div>
      ),
    },
    { title: "Store", key: "store", render: (_: any, r: any) => r.store?.name || storeMap[r.storeId] || "—" },
    { title: "Category", key: "category", render: (_: any, r: any) => r.category?.name || "—" },
    { title: "Brand", key: "brand", render: (_: any, r: any) => r.brand?.name || "—" },
    {
      title: "Stock Status", key: "stockStatus", align: "center" as const, width: 120,
      render: (_: any, r: any) => (
        <Tag style={{ background: STOCK_STATUS_COLOR[r.stockStatus] || "#6b7280", color: "#fff", border: "none", fontSize: 11 }}>
          {r.stockStatus?.replace(/_/g, " ")}
        </Tag>
      ),
    },
    { title: "Current", dataIndex: "currentStock", key: "currentStock", align: "center" as const, width: 80 },
    { title: "Required", dataIndex: "requiredQuantity", key: "requiredQuantity", align: "center" as const, width: 80 },
    { title: "Purchased", dataIndex: "purchasedQuantity", key: "purchasedQuantity", align: "center" as const, width: 90, render: (v: any) => v ?? "—" },
    { title: "Price/Unit", dataIndex: "pricePerUnit", key: "pricePerUnit", align: "right" as const, width: 100, render: fmtCurrency },
    {
      title: "Status", key: "status", align: "center" as const, width: 140,
      render: (_: any, r: any) => (
        <Tag style={{ background: STATUS_COLOR[r.status] || "#6b7280", color: "#fff", border: "none" }}>
          {r.status?.replace(/_/g, " ")}
        </Tag>
      ),
    },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    { title: "Actions", key: "actions", align: "center" as const, width: 130, render: (_: any, r: any) => actionButtons(r) },
  ];

  const reportColumns: ColumnType<any>[] = [
    {
      title: "Product", key: "product",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.product?.name || "—"}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.product?.sku}</div>
        </div>
      ),
    },
    { title: "Category", key: "category", render: (_: any, r: any) => r.category?.name || "—" },
    { title: "Brand", key: "brand", render: (_: any, r: any) => r.brand?.name || "—" },
    { title: "Required", dataIndex: "requiredQuantity", key: "requiredQuantity", align: "center" as const, width: 90 },
    { title: "Purchased", dataIndex: "purchasedQuantity", key: "purchasedQuantity", align: "center" as const, width: 90 },
    { title: "Price/Unit", dataIndex: "pricePerUnit", key: "pricePerUnit", align: "right" as const, width: 100, render: fmtCurrency },
    { title: "Updated", dataIndex: "updatedAt", key: "updatedAt", width: 110, render: fmtDate },
  ];

  const storeSelector = (
    <Select
      value={storeId || undefined}
      onChange={setStoreId}
      placeholder="Select Store"
      style={{ width: 180 }}
      options={stores.map((s: any) => ({ value: s.id, label: s.name }))}
    />
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Purchase Requisition</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage stock purchase requests</div>
        </div>
        {storeSelector}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: "All Requisitions",
            children: (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                  <Select
                    allowClear placeholder="Status"
                    style={{ width: 180 }}
                    value={filters.status}
                    onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                    options={[
                      { value: "PENDING", label: "Pending" },
                      { value: "PURCHASED", label: "Purchased" },
                      { value: "PARTIALLY_PURCHASED", label: "Partially Purchased" },
                      { value: "REMOVED", label: "Removed" },
                    ]}
                  />
                  <Select
                    allowClear placeholder="Stock Status"
                    style={{ width: 160 }}
                    value={filters.stockStatus}
                    onChange={(v) => setFilters((f) => ({ ...f, stockStatus: v }))}
                    options={[
                      { value: "LOW_STOCK", label: "Low Stock" },
                      { value: "OUT_OF_STOCK", label: "Out of Stock" },
                    ]}
                  />
                </div>
                {listQuery.isError && <Alert type="error" message="Failed to load requisitions." style={{ margin: 16 }} />}
                <Table
                  columns={columns} dataSource={items} rowKey="id"
                  loading={listQuery.isFetching} size="middle" scroll={{ x: "max-content" }}
                  pagination={{ pageSize: 20, showTotal: (t) => `Total ${t}` }}
                  rowClassName={rowClassName} onRow={onRow}
                />
              </div>
            ),
          },
          {
            key: "report",
            label: "Purchased Report",
            children: (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                  <DatePicker
                    placeholder="Start Date"
                    onChange={(_, v) => setReportDates((d) => ({ ...d, startDate: v as string || undefined }))}
                  />
                  <DatePicker
                    placeholder="End Date"
                    onChange={(_, v) => setReportDates((d) => ({ ...d, endDate: v as string || undefined }))}
                  />
                </div>
                <Table
                  columns={reportColumns}
                  dataSource={reportQuery.data?.result || []}
                  rowKey="id" loading={reportQuery.isFetching} size="middle"
                  pagination={{ pageSize: 20, showTotal: (t) => `Total ${t}` }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3} />
                      <Table.Summary.Cell index={3} align="center">
                        <strong>{(reportQuery.data?.result || []).reduce((s: number, r: any) => s + (r.requiredQuantity || 0), 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="center">
                        <strong>{(reportQuery.data?.result || []).reduce((s: number, r: any) => s + (r.purchasedQuantity || 0), 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <strong>
                          {fmtCurrency(
                            (reportQuery.data?.result || []).reduce(
                              (s: number, r: any) => s + (r.pricePerUnit || 0) * (r.purchasedQuantity || 0), 0
                            )
                          )}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} />
                    </Table.Summary.Row>
                  )}
                />
              </div>
            ),
          },
        ]}
      />

      {/* View Modal */}
      <Modal
        open={!!viewItem}
        title="Requisition Details"
        footer={<Button onClick={() => setViewItem(null)}>Close</Button>}
        onCancel={() => setViewItem(null)}
      >
        {viewItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Product", viewItem.product?.name],
              ["SKU", viewItem.product?.sku],
              ["Store", viewItem.store?.name],
              ["Category", viewItem.category?.name],
              ["Brand", viewItem.brand?.name],
              ["Model", viewItem.model?.name],
              ["Master Brand", viewItem.masterBrand?.name],
              ["Stock Status", viewItem.stockStatus?.replace(/_/g, " ")],
              ["Current Stock", viewItem.currentStock],
              ["Required Qty", viewItem.requiredQuantity],
              ["Purchased Qty", viewItem.purchasedQuantity ?? "—"],
              ["Price/Unit", fmtCurrency(viewItem.pricePerUnit)],
              ["Status", viewItem.status?.replace(/_/g, " ")],
              ["Notes", viewItem.notes || "—"],
              ["Created", fmtDate(viewItem.createdAt)],
              ["Updated", fmtDate(viewItem.updatedAt)],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{val as string}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Mark Purchased Modal */}
      <Modal
        open={!!purchaseModal}
        title="Mark as Purchased"
        onCancel={() => { setPurchaseModal(null); purchaseForm.resetFields(); }}
        onOk={() =>
          purchaseForm.validateFields().then((vals) =>
            markPurchasedMutation.mutate({ id: purchaseModal.id, body: vals })
          )
        }
        okButtonProps={{ loading: markPurchasedMutation.isPending }}
        okText="Confirm Purchase"
      >
        <Form form={purchaseForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="purchasedQuantity" label="Purchased Quantity" rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="pricePerUnit" label="Price Per Unit" rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={0} precision={2} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="e.g. Purchased from supplier ABC" />
          </Form.Item>
        </Form>
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "E",      label: "Mark Purchased" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "V",      label: "View details" },
        { key: "E",      label: "Mark as purchased" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
