import { useState, useCallback, useRef } from "react";
import {
  Table, Button, Input, Select, Modal, Form,
  Alert, Tooltip, Popconfirm, message, Switch, Tag,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitService } from "../api/services";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";
import type { ColumnType } from "antd/es/table";

export default function Unit() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const limit                 = 10;
  const [keyword, setKeyword] = useState("");
  const [status, setStatus]   = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form] = Form.useForm();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = useCallback((val: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setKeyword(val); setPage(1); }, 500);
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ["units", page, keyword, status],
    queryFn: () => unitService.getAll({ limit, offset: (page - 1) * limit, keyword, status })
      .then(r => r.data),
    staleTime: 30_000,
  });

  const statsQuery = useQuery({
    queryKey: ["units-stats"],
    queryFn: () => unitService.getStats().then(r => r.data?.data || r.data),
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["units"] });
    qc.invalidateQueries({ queryKey: ["units-stats"] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (v: any) => unitService.create(v),
    onSuccess: (res) => { const id = res.data?.id || res.data?.data?.id; message.success("Unit created"); setShowForm(false); form.resetFields(); invalidate(); if (id) setFocusedId(id); },
    onError: () => message.error("Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => unitService.update(id, v),
    onSuccess: (_, vars) => { const id = vars.id; message.success("Unit updated"); setShowForm(false); setEditItem(null); form.resetFields(); invalidate(); if (id) setFocusedId(id); },
    onError: () => message.error("Failed to update"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "DEACTIVE" }) => unitService.updateStatus(id, status),
    onSuccess: () => { message.success("Status updated"); invalidate(); },
    onError: () => message.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitService.delete(id),
    onSuccess: () => { message.success("Unit deleted"); invalidate(); },
    onError: () => message.error("Failed to delete"),
  });

  const openCreate = () => { setEditItem(null); form.resetFields(); setShowForm(true); };
  const openEdit   = (r: any) => { setEditItem(r); form.setFieldsValue({ name: r.name, shortName: r.shortName }); setShowForm(true); };
  const closeModal = () => { setShowForm(false); setEditItem(null); form.resetFields(); };
  const onFinish   = (v: any) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, ...v });
    else          createMutation.mutate(v);
  };

  const stats = statsQuery.data;
  const items = listQuery.data?.result || [];
  const total = listQuery.data?.total  || 0;
  const { searchRef, setFocusedId, rowClassName, onRow } = usePageShortcuts({
    onNew: openCreate,
    isModalOpen: showForm,
    onCloseModal: closeModal,
    onEdit: openEdit,
    items,
    isFetching: listQuery.isFetching,
  });


  const columns: ColumnType<any>[] = [
    {
      title: "Name", dataIndex: "name", key: "name",
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: "Short Name", dataIndex: "shortName", key: "shortName",
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Status", key: "status", align: "center" as const,
      render: (_: any, r: any) => (
        <Switch
          checked={r.status?.toUpperCase() === "ACTIVE"}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          onChange={checked => statusMutation.mutate({ id: r.id, status: checked ? "ACTIVE" : "DEACTIVE" })}
          style={{ background: r.status?.toUpperCase() === "ACTIVE" ? "#059669" : undefined }}
        />
      ),
    },
    {
      title: "Created", dataIndex: "createdAt", key: "createdAt",
      render: (v: string) => new Date(v).toLocaleDateString("en-IN"),
    },
    {
      title: "Actions", key: "actions", align: "center" as const,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm title="Delete this unit?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Units</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage all measurement units</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: "#2563eb" }}>
          New Unit
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {([
            ["Total",    stats.total,    "#2563eb"],
            ["Active",   stats.active,   "#059669"],
            ["Inactive", stats.deactive, "#dc2626"],
          ] as [string, number, string][]).map(([label, val, color]) => (
            <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}`, minWidth: 120 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{val ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Input prefix={<SearchOutlined style={{ color: "#9ca3af" }} />} suffix={<kbd style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3, padding: "0 5px", fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>Alt+S</kbd>} placeholder="Search…" ref={searchRef} onChange={e => handleSearch(e.target.value)} style={{ width: 260 }} allowClear />
        <Select value={status} onChange={v => { setStatus(v); setPage(1); }} style={{ width: 150 }}
          options={[{ value: "", label: "All Status" }, { value: "ACTIVE", label: "Active" }, { value: "DEACTIVE", label: "Inactive" }]} />
        {(keyword || status) && <Button onClick={() => { setKeyword(""); setStatus(""); setPage(1); }}>Clear</Button>}
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load units." style={{ marginBottom: 12 }} />}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={listQuery.isLoading || listQuery.isFetching}
          size="middle"
          rowClassName={rowClassName}
          onRow={onRow}
          pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: t => `Total ${t} units` }}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showForm}
        title={editItem ? <><EditOutlined /> Edit Unit</> : <><PlusOutlined /> New Unit</>}
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g. KILOGRAM" />
          </Form.Item>
          <Form.Item name="shortName" label="Short Name" rules={[{ required: true, message: "Short name is required" }]}>
            <Input placeholder="e.g. KG" />
          </Form.Item>
          <Button
            type="primary" htmlType="submit" block
            loading={createMutation.isPending || updateMutation.isPending}
            style={{ background: "#2563eb" }}
            icon={editItem ? <CheckCircleOutlined /> : <PlusOutlined />}
          >
            {editItem ? "Update" : "Create"}
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
