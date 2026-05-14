import React, { useState, useRef, useEffect } from "react";
import {
  Table, Button, Input, Select, Tag, Tooltip, message, Modal,
  Alert, Popconfirm, Form, InputNumber, DatePicker, Typography, Space,
} from "antd";
import {
  PlusOutlined, CheckOutlined, CloseOutlined, EyeOutlined,
  EditOutlined, DeleteOutlined, DownloadOutlined, SearchOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { expenseService, storeService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import dayjs from "dayjs";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const { Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d97706",
  APPROVED: "#059669",
  REJECTED: "#dc2626",
};

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtRs = (v: any) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

export default function Expense() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [storeId, setStoreId] = useState("");
  const [dateRange, setDateRange] = useState<[any, any]>([null, null]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [createModal, setCreateModal] = useState(false);
  const [acceptModal, setAcceptModal] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [form] = Form.useForm();
  const [acceptForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  const storesQuery = useQuery({
    queryKey: ["stores-active"],
    queryFn: () => storeService.search().then((r: any) => r || []),
    staleTime: 300_000,
  });
  const stores: any[] = storesQuery.data || [];

  useEffect(() => {
    if (stores.length && !storeId) {
      const def = stores.find((s: any) => s.defaultStore) || stores[0];
      if (def) setStoreId(def.id);
    }
  }, [stores]);

  const listQuery = useQuery({
    queryKey: ["expense-list", page, keyword, statusFilter, storeId, dateRange[0], dateRange[1]],
    queryFn: () => expenseService.getAll({
      limit,
      offset: (page - 1) * limit,
      keyword: keyword || undefined,
      status: statusFilter || undefined,
      storeId: storeId || undefined,
      fromDate: dateRange[0]?.format("YYYY-MM-DD"),
      toDate: dateRange[1]?.format("YYYY-MM-DD"),
    }).then((r) => r.data),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["expense-list"] });

  const createMutation = useMutation({
    mutationFn: (body: any) => expenseService.create(body),
    onSuccess: () => { message.success("Expense created"); setCreateModal(false); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to create expense"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => expenseService.update(id, body),
    onSuccess: () => { message.success("Expense updated"); setEditItem(null); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to update expense"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.delete(id),
    onSuccess: () => { message.success("Deleted"); invalidate(); },
    onError: () => message.error("Failed to delete"),
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => expenseService.accept(id, note),
    onSuccess: () => { message.success("Expense accepted"); setAcceptModal(null); acceptForm.resetFields(); invalidate(); },
    onError: () => message.error("Failed to accept"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => expenseService.reject(id, reason),
    onSuccess: () => { message.success("Expense rejected"); setRejectModal(null); rejectForm.resetFields(); invalidate(); },
    onError: () => message.error("Failed to reject"),
  });

  const handleExport = async () => {
    try {
      const res = await expenseService.export(storeId || undefined);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = "expenses.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error("Export failed"); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    form.setFieldsValue({
      title: item.title,
      amount: item.amount,
      description: item.description,
      expenseDate: item.expenseDate ? dayjs(item.expenseDate) : null,
    });
  };

  const handleFormSubmit = () => {
    form.validateFields().then((vals) => {
      const body = { ...vals, expenseDate: vals.expenseDate?.format("YYYY-MM-DD"), storeId: storeId || undefined };
      if (editItem) updateMutation.mutate({ id: editItem.id, body });
      else createMutation.mutate(body);
    });
  };

  const items: any[] = listQuery.data?.result || [];
  const total: number = listQuery.data?.total || 0;

  const anyModalOpen = createModal || !!editItem || !!viewItem || !!acceptModal || !!rejectModal;
  const { searchRef, rowClassName, onRow, searchInputProps, focusedId } = usePageShortcuts({
    onNew: () => { form.resetFields(); setCreateModal(true); },
    isModalOpen: anyModalOpen,
    onCloseModal: () => { setCreateModal(false); setEditItem(null); setViewItem(null); setAcceptModal(null); setRejectModal(null); form.resetFields(); },
    onEdit: (r) => openEdit(r),
    items,
    isFetching: listQuery.isFetching,
  });

  // extra row shortcuts: V=view, A=accept, X=reject
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
      if ((e.key === "a" || e.key === "A") && row.status === "PENDING") { e.preventDefault(); setAcceptModal(row); }
      if ((e.key === "x" || e.key === "X") && row.status === "PENDING") { e.preventDefault(); setRejectModal(row); }
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
      {r.status !== "APPROVED" && (
        <Tooltip title="Edit">
          <Button size="small" icon={<EditOutlined />} style={{ color: "#2563eb", borderColor: "#2563eb" }} onClick={() => openEdit(r)}><kbd style={kbdRow}>E</kbd></Button>
        </Tooltip>
      )}
      {r.status === "PENDING" && (
        <>
          <Tooltip title="Accept">
            <Button size="small" icon={<CheckOutlined />} style={{ color: "#059669", borderColor: "#059669" }}
              onClick={() => setAcceptModal(r)}><kbd style={kbdRow}>A</kbd></Button>
          </Tooltip>
          <Tooltip title="Reject">
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => setRejectModal(r)}><kbd style={kbdRow}>X</kbd></Button>
          </Tooltip>
        </>
      )}
      <Popconfirm title="Delete this expense?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
        <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
      </Popconfirm>
    </Space>
  );

  const columns: ColumnType<any>[] = [
    {
      title: "Title", key: "title",
      render: (_: any, r: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.title || "—"}</Text>
          {r.description && <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.description}</div>}
        </div>
      ),
    },
    { title: "Staff", key: "staff", render: (_: any, r: any) => r.account?.staffDetail?.[0]?.name || r.account?.email || "—" },
    { title: "Store", key: "store", render: (_: any, r: any) => r.store?.name || "—" },
    { title: "Amount", dataIndex: "amount", key: "amount", align: "right" as const, width: 110, render: fmtRs },
    { title: "Expense Date", dataIndex: "expenseDate", key: "expenseDate", width: 120, render: fmtDate },
    {
      title: "Status", key: "status", align: "center" as const, width: 110,
      render: (_: any, r: any) => (
        <Tag style={{ background: STATUS_COLOR[r.status] || "#6b7280", color: "#fff", border: "none" }}>
          {r.status || "—"}
        </Tag>
      ),
    },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    { title: "Actions", key: "actions", align: "center" as const, width: 180, render: (_: any, r: any) => actionButtons(r) },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Expense</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Track and manage business expenses</div>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport} style={{ color: "#059669", borderColor: "#059669" }}>
            Export
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateModal(true); }}
            style={{ background: "#2563eb" }}>
            Add Expense <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 }}>Alt+N</kbd>
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          placeholder="Search title / description…"
          value={searchInput}
          ref={searchRef}
          onChange={(e) => {
            setSearchInput(e.target.value);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => { setKeyword(e.target.value); setPage(1); }, 500);
          }}
          style={{ width: 240 }}
          allowClear
          onClear={() => { setKeyword(""); setPage(1); }}
          {...searchInputProps}
        />
        <Select
          value={storeId || undefined}
          onChange={(v) => { setStoreId(v || ""); setPage(1); }}
          placeholder="All Stores" allowClear style={{ width: 180 }}
          options={stores.map((s: any) => ({ value: s.id, label: s.name }))}
        />
        <Select
          value={statusFilter || undefined}
          onChange={(v) => { setStatusFilter(v || ""); setPage(1); }}
          placeholder="All Status" allowClear style={{ width: 140 }}
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
        <DatePicker.RangePicker
          value={dateRange[0] && dateRange[1] ? dateRange : null}
          onChange={(v) => { setDateRange(v ? [v[0], v[1]] : [null, null]); setPage(1); }}
          format="YYYY-MM-DD"
          placeholder={["From Date", "To Date"]}
        />
        {(keyword || statusFilter || dateRange[0]) && (
          <Button onClick={() => { setSearchInput(""); setKeyword(""); setStatusFilter(""); setDateRange([null, null]); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load expenses." style={{ marginBottom: 12 }} />}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns} dataSource={items} rowKey="id"
          loading={listQuery.isFetching} size="middle" scroll={{ x: "max-content" }}
          pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: (t) => `Total ${t}` }}
          rowClassName={rowClassName} onRow={onRow}
        />
      </div>

      {/* View Modal */}
      <Modal
        open={!!viewItem}
        title="Expense Details"
        footer={<Button onClick={() => setViewItem(null)}>Close</Button>}
        onCancel={() => setViewItem(null)}
      >
        {viewItem && (
          <div>
            {[
              ["Title", viewItem.title],
              ["Amount", fmtRs(viewItem.amount)],
              ["Status", viewItem.status],
              ["Expense Date", fmtDate(viewItem.expenseDate)],
              ["Store", viewItem.store?.name || "—"],
              ["Staff", viewItem.account?.staffDetail?.[0]?.name || viewItem.account?.email || "—"],
              ["Description", viewItem.description || "—"],
              ["Rejection Reason", viewItem.rejectionReason || "—"],
              ["Created", fmtDate(viewItem.createdAt)],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{val as string}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        open={createModal || !!editItem}
        title={editItem ? "Edit Expense" : "Add Expense"}
        onCancel={() => { setCreateModal(false); setEditItem(null); form.resetFields(); }}
        onOk={handleFormSubmit}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
        okText={editItem ? "Update" : "Create"}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Expense title" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="amount" label="Amount" rules={[{ required: true, message: "Required" }]}>
              <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
            </Form.Item>
            <Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true, message: "Required" }]}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Accept Modal */}
      <Modal
        open={!!acceptModal}
        title="Accept Expense"
        onCancel={() => { setAcceptModal(null); acceptForm.resetFields(); }}
        onOk={() => acceptForm.validateFields().then((vals) => acceptMutation.mutate({ id: acceptModal.id, note: vals.note }))}
        okButtonProps={{ loading: acceptMutation.isPending, style: { background: "#059669" } }}
        okText="Accept"
      >
        <div style={{ marginBottom: 12, color: "#6b7280" }}>
          Accepting <strong>{acceptModal?.title}</strong> — {fmtRs(acceptModal?.amount)}
        </div>
        <Form form={acceptForm} layout="vertical">
          <Form.Item name="note" label="Note (optional)">
            <Input.TextArea rows={2} placeholder="Optional note to staff" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        title="Reject Expense"
        onCancel={() => { setRejectModal(null); rejectForm.resetFields(); }}
        onOk={() => rejectForm.validateFields().then((vals) => rejectMutation.mutate({ id: rejectModal.id, reason: vals.reason }))}
        okButtonProps={{ loading: rejectMutation.isPending, danger: true }}
        okText="Reject"
      >
        <div style={{ marginBottom: 12, color: "#6b7280" }}>
          Rejecting <strong>{rejectModal?.title}</strong> — {fmtRs(rejectModal?.amount)}
        </div>
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Reason is required" }]}>
            <Input.TextArea rows={2} placeholder="Reason for rejection" />
          </Form.Item>
        </Form>
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "V",      label: "View expense" },
        { key: "E",      label: "Edit expense" },
        { key: "A",      label: "Accept (pending only)" },
        { key: "X",      label: "Reject (pending only)" },
        { key: "Alt+N",  label: "Add new expense" },
        { key: "Alt+S",  label: "Focus search" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
