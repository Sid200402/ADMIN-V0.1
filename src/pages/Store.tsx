import { useState, useCallback, useRef } from "react";
import {
  Table, Tag, Button, Input, Select, Modal, Form,
  Alert, Tooltip, Popconfirm, message, Switch,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, StarOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storeService } from "../api/services";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";
import type { ColumnType } from "antd/es/table";

export default function Store() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const limit                   = 10;
  const [keyword, setKeyword]   = useState("");
  const [status, setStatus]     = useState("");
  const [editStore, setEditStore] = useState<any>(null);
  const [showForm, setShowForm]   = useState(false);
  const [form] = Form.useForm();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = useCallback((val: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setKeyword(val); setPage(1); }, 500);
  }, []);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const storesQuery = useQuery({
    queryKey: ["stores", page, keyword, status],
    queryFn: () => storeService.getAll({ limit, offset: (page - 1) * limit, keyword, status }).then(r => r.data?.data || r.data),
    staleTime: 30_000,
  });

  const statsQuery = useQuery({
    queryKey: ["store-stats"],
    queryFn: () => storeService.getStats().then(r => r.data?.data || r.data),
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["stores"] });
    qc.invalidateQueries({ queryKey: ["store-stats"] });
    qc.invalidateQueries({ queryKey: ["stores-list"] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (v: any) => storeService.create(v),
    onSuccess: (res) => { const id = res.data?.id || res.data?.data?.id; message.success("Store created"); setShowForm(false); form.resetFields(); invalidate(); if (id) setFocusedId(id); },
    onError: () => message.error("Failed to create store"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => storeService.update(id, v),
    onSuccess: (_, vars) => { const id = vars.id; message.success("Store updated"); setShowForm(false); setEditStore(null); form.resetFields(); invalidate(); if (id) setFocusedId(id); },
    onError: () => message.error("Failed to update store"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => storeService.updateStatus(id, status),
    onSuccess: () => { message.success("Status updated"); invalidate(); },
    onError: () => message.error("Failed to update status"),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => storeService.setDefault(id),
    onSuccess: () => { message.success("Default store set"); invalidate(); },
    onError: () => message.error("Failed to set default"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => storeService.delete(id),
    onSuccess: () => { message.success("Store deleted"); invalidate(); },
    onError: () => message.error("Failed to delete store"),
  });

  const openCreate = () => { setEditStore(null); form.resetFields(); setShowForm(true); };
  const openEdit   = (s: any) => { setEditStore(s); form.setFieldsValue(s); setShowForm(true); };
  const closeModal = () => { setShowForm(false); setEditStore(null); form.resetFields(); };

  const onFinish = (v: any) => {
    if (editStore) updateMutation.mutate({ id: editStore.id, ...v });
    else           createMutation.mutate(v);
  };

  const stats  = statsQuery.data;
  const stores = storesQuery.data?.result || storesQuery.data?.data?.result || [];
  const total  = storesQuery.data?.total  || storesQuery.data?.data?.total  || 0;

  const { searchRef, setFocusedId, rowClassName, onRow } = usePageShortcuts({
    onNew: openCreate,
    isModalOpen: showForm,
    onCloseModal: closeModal,
    onEdit: openEdit,
    items: stores,
    isFetching: storesQuery.isFetching,
  });

  // ── Columns ───────────────────────────────────────────────────────────────────
  const columns: ColumnType<any>[] = [
    {
      title: "Store",
      key: "name",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#111827" }}>{r.name}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Code: {r.storeCode}</div>
        </div>
      ),
    },
    { title: "Phone",   dataIndex: "phone",   key: "phone",   render: (v: string) => v || "—" },
    { title: "Email",   dataIndex: "email",   key: "email",   render: (v: string) => v || "—" },
    { title: "Address", dataIndex: "address", key: "address", render: (v: string) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v || "—"}</span> },
    {
      title: "Default",
      key: "default",
      align: "center" as const,
      render: (_: any, r: any) => r.defaultStore
        ? <Tag color="gold" icon={<StarOutlined />}>Default</Tag>
        : <Tooltip title="Set as default"><Button size="small" icon={<StarOutlined />} onClick={() => defaultMutation.mutate(r.id)} /></Tooltip>,
    },
    {
      title: "Status",
      key: "status",
      align: "center" as const,
      render: (_: any, r: any) => (
        <Switch
          checked={r.status === "ACTIVE"}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          onChange={(checked) => statusMutation.mutate({ id: r.id, status: checked ? "ACTIVE" : "DEACTIVE" })}
          style={{ background: r.status === "ACTIVE" ? "#059669" : undefined }}
        />
      ),
    },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", render: (v: string) => new Date(v).toLocaleDateString("en-IN") },
    {
      title: "Actions",
      key: "actions",
      align: "center" as const,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          {!r.defaultStore && (
            <Popconfirm title="Delete this store?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
              <Tooltip title="Delete">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Store Management</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage all your stores</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: "#2563eb" }}>
          New Store <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 }}>Alt+N</kbd>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            ["Total",    stats.total,    "#2563eb"],
            ["Active",   stats.active,   "#059669"],
            ["Inactive", stats.deactive, "#dc2626"],
          ].map(([label, val, color]) => (
            <div key={label as string} style={{ background: "#fff", borderRadius: 10, padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}`, minWidth: 120 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: color as string }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Input prefix={<SearchOutlined style={{ color: "#9ca3af" }} />} placeholder="Search… (Alt+S)" ref={searchRef} onChange={e => handleSearch(e.target.value)} style={{ width: 260 }} allowClear />
        <Select value={status} onChange={v => { setStatus(v); setPage(1); }} style={{ width: 150 }}
          options={[{ value: "", label: "All Status" }, { value: "ACTIVE", label: "Active" }, { value: "DEACTIVE", label: "Inactive" }]} />
        {(keyword || status) && <Button onClick={() => { setKeyword(""); setStatus(""); setPage(1); }}>Clear</Button>}
      </div>

      {storesQuery.isError && <Alert type="error" message="Failed to load stores." className="mb-4" />}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={stores}
          rowKey="id"
          loading={storesQuery.isLoading || storesQuery.isFetching}
          scroll={{ x: true }}
          size="middle"
          rowClassName={rowClassName}
          onRow={onRow}
          pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: t => `Total ${t} stores` }}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showForm}
        title={editStore ? <><EditOutlined /> Edit Store</> : <><PlusOutlined /> New Store</>}
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Store Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. MAIN STORE" />
          </Form.Item>
          <Form.Item name="storeCode" label="Store Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. STR-001" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="9876543210" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="store@example.com" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button
            type="primary" htmlType="submit" block
            loading={createMutation.isPending || updateMutation.isPending}
            style={{ background: "#2563eb" }}
            icon={editStore ? <CheckCircleOutlined /> : <PlusOutlined />}
          >
            {editStore ? "Update Store" : "Create Store"}
          </Button>
        </Form>
      </Modal>
      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Move selection" },
        { key: "Esc",    label: "Clear selection" },
        { key: "Enter",  label: "Focus first row" },
        { key: "E",      label: "Edit" },
        { key: "Alt+S",  label: "Focus search" },
        { key: "Alt+N",  label: "New item" },
      ]} />
    </div>
  );
}
