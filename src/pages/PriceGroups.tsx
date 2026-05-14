import { useState, useCallback, useRef } from "react";
import {
  Table, Button, Input, Select, Modal, Form,
  Alert, Tooltip, Popconfirm, message, InputNumber, Switch,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { priceGroupService } from "../api/services";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";
import type { ColumnType } from "antd/es/table";

export default function PriceGroups() {
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

  const listQuery = useQuery({
    queryKey: ["price-groups", page, keyword, status],
    queryFn: () => priceGroupService.getAll({ limit, offset: (page - 1) * limit, keyword, status })
      .then(r => r.data),
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["price-groups"] });
  };

  const createMutation = useMutation({
    mutationFn: (v: any) => priceGroupService.create(v),
    onSuccess: (res) => { const id = res.data?.id || res.data?.data?.id; message.success("Price group created"); setShowForm(false); form.resetFields(); invalidate(); if (id) setFocusedId(id); },
    onError: () => message.error("Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => priceGroupService.update(id, v),
    onSuccess: (_, vars) => { const id = vars.id; message.success("Price group updated"); setShowForm(false); setEditItem(null); form.resetFields(); invalidate(); if (id) setFocusedId(id); },
    onError: () => message.error("Failed to update"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "DEACTIVE" }) => priceGroupService.updateStatus(id, status),
    onSuccess: () => { message.success("Status updated"); invalidate(); },
    onError: () => message.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => priceGroupService.delete(id),
    onSuccess: () => { message.success("Price group deleted"); invalidate(); },
    onError: () => message.error("Failed to delete"),
  });

  const openCreate = () => { setEditItem(null); form.resetFields(); setShowForm(true); };
  const openEdit   = (r: any) => { setEditItem(r); form.setFieldsValue({ name: r.name, serialNo: r.serialNo }); setShowForm(true); };
  const closeModal = () => { setShowForm(false); setEditItem(null); form.resetFields(); };
  const onFinish   = (v: any) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, ...v });
    else          createMutation.mutate(v);
  };

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
      title: "Serial No", dataIndex: "serialNo", key: "serialNo",
      align: "center" as const,
      render: (v: number) => v || "—",
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
          <Popconfirm title="Delete this price group?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Price Groups</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage all price groups</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: "#2563eb" }}>
          New Price Group <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 }}>Alt+N</kbd>
        </Button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Input prefix={<SearchOutlined style={{ color: "#9ca3af" }} />} placeholder="Search… (Alt+S)" ref={searchRef} onChange={e => handleSearch(e.target.value)} style={{ width: 260 }} allowClear />
        <Select value={status} onChange={v => { setStatus(v); setPage(1); }} style={{ width: 150 }}
          options={[{ value: "", label: "All Status" }, { value: "ACTIVE", label: "Active" }, { value: "DEACTIVE", label: "Inactive" }]} />
        {(keyword || status) && <Button onClick={() => { setKeyword(""); setStatus(""); setPage(1); }}>Clear</Button>}
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load price groups." style={{ marginBottom: 12 }} />}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={listQuery.isLoading || listQuery.isFetching}
          size="middle"
          rowClassName={rowClassName}
          onRow={onRow}
          pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: t => `Total ${t} price groups` }}
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? <><EditOutlined /> Edit Price Group</> : <><PlusOutlined /> New Price Group</>}
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g. RETAIL, WHOLESALE" />
          </Form.Item>
          <Form.Item name="serialNo" label="Serial No">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="Optional ordering number" />
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
