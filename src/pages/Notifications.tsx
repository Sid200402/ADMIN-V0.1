import { useState, useEffect } from "react";
import {
  Table, Button, Tag, Tooltip, message, Modal, Form, Input,
  Select, Popconfirm, Badge, Alert, Space,
} from "antd";
import {
  PlusOutlined, CheckOutlined, DeleteOutlined,
  BellOutlined, WarningOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { notificationService, storeService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const TYPE_COLOR: Record<string, string> = {
  SYSTEM: "#2563eb", WARNING: "#d97706", SUCCESS: "#059669", ERROR: "#dc2626",
  LOW_STOCK: "#d97706", OUT_OF_STOCK: "#dc2626", CASH_OUT_REQUEST: "#7c3aed",
};

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Notifications() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;
  const [createModal, setCreateModal] = useState(false);
  const [lowStockModal, setLowStockModal] = useState(false);
  const [lowStockStoreId, setLowStockStoreId] = useState("");
  const [form] = Form.useForm();

  const storesQuery = useQuery({
    queryKey: ["stores-active"],
    queryFn: () => storeService.search().then((r: any) => r || []),
    staleTime: 300_000,
  });
  const stores: any[] = storesQuery.data || [];

  useEffect(() => {
    if (stores.length && !lowStockStoreId) {
      const def = stores.find((s: any) => s.defaultStore) || stores[0];
      if (def) setLowStockStoreId(def.id);
    }
  }, [stores]);

  const listQuery = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => notificationService.getAll({ limit, offset: (page - 1) * limit }).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const countQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationService.getUnreadCount().then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const lowStockQuery = useQuery({
    queryKey: ["notif-low-stock", lowStockStoreId],
    queryFn: () => notificationService.getLowStock(lowStockStoreId).then((r) => r.data),
    enabled: false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const createMutation = useMutation({
    mutationFn: (body: any) => notificationService.create(body),
    onSuccess: () => { message.success("Notification sent"); setCreateModal(false); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to send"),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string | number) => notificationService.markRead(id),
    onSuccess: () => invalidate(),
    onError: () => message.error("Failed"),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => { message.success("All marked as read"); invalidate(); },
    onError: () => message.error("Failed"),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationService.clearAll(),
    onSuccess: () => { message.success("Cleared"); invalidate(); },
    onError: () => message.error("Failed"),
  });

  const items: any[] = listQuery.data?.result || [];
  const total: number = listQuery.data?.total || 0;
  const unreadCount: number = countQuery.data?.count || 0;
  const lowStockItems: any[] = lowStockQuery.data?.result || [];

  const anyModalOpen = createModal || lowStockModal;
  const { rowClassName, onRow } = usePageShortcuts({
    onNew: () => { form.resetFields(); setCreateModal(true); },
    isModalOpen: anyModalOpen,
    onCloseModal: () => { setCreateModal(false); setLowStockModal(false); form.resetFields(); },
    items,
    isFetching: listQuery.isFetching,
  });

  const columns: ColumnType<any>[] = [
    {
      title: "Notification", key: "title",
      render: (_: any, r: any) => (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: r.read ? "#d1d5db" : "#2563eb",
            marginTop: 5, flexShrink: 0,
          }} />
          <div>
            <div style={{ fontWeight: r.read ? 400 : 700, fontSize: 13 }}>{r.title || "—"}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{r.desc || ""}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Type", dataIndex: "type", key: "type", align: "center" as const, width: 150,
      render: (v: string) => v
        ? <Tag style={{ background: TYPE_COLOR[v] || "#6b7280", color: "#fff", border: "none", fontSize: 11 }}>{v.replace(/_/g, " ")}</Tag>
        : "—",
    },
    {
      title: "Status", key: "read", align: "center" as const, width: 90,
      render: (_: any, r: any) => r.read
        ? <Tag style={{ background: "#059669", color: "#fff", border: "none", fontSize: 11 }}>Read</Tag>
        : <Tag style={{ background: "#2563eb", color: "#fff", border: "none", fontSize: 11 }}>Unread</Tag>,
    },
    { title: "Date", dataIndex: "createdAt", key: "createdAt", width: 160, render: fmtDate },
    {
      title: "Actions", key: "actions", align: "center" as const, width: 80,
      render: (_: any, r: any) => !r.read ? (
        <Tooltip title="Mark as read">
          <Button size="small" icon={<CheckOutlined />} style={{ color: "#059669", borderColor: "#059669" }}
            loading={markReadMutation.isPending}
            onClick={() => markReadMutation.mutate(r.id)} />
        </Tooltip>
      ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Notifications</div>
            {unreadCount > 0 && <Badge count={unreadCount} style={{ background: "#dc2626" }} />}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>System and stock notifications</div>
        </div>
        <Space wrap>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={() => invalidate()} loading={listQuery.isFetching} />
          </Tooltip>
          <Button icon={<WarningOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }}
            onClick={() => setLowStockModal(true)}>
            Low Stock Check
          </Button>
          {unreadCount > 0 && (
            <Button icon={<CheckOutlined />} onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
              Mark All Read
            </Button>
          )}
          <Popconfirm title="Clear all notifications?" onConfirm={() => clearAllMutation.mutate()} okText="Yes" cancelText="No">
            <Button danger icon={<DeleteOutlined />} loading={clearAllMutation.isPending}>Clear All</Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateModal(true); }}
            style={{ background: "#2563eb" }}>
            Create
          </Button>
        </Space>
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load notifications." style={{ marginBottom: 12 }} />}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns} dataSource={items} rowKey="id"
          loading={listQuery.isFetching} size="middle"
          rowClassName={(r) => [r.read ? "" : "notif-unread", rowClassName(r)].filter(Boolean).join(" ")}
          onRow={onRow}
          pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: (t) => `Total ${t}` }}
        />
      </div>
      <style>{`.notif-unread td { background: #eff6ff !important; }`}</style>

      {/* Create Modal */}
      <Modal
        open={createModal}
        title="Create Notification"
        onCancel={() => { setCreateModal(false); form.resetFields(); }}
        onOk={() => form.validateFields().then((vals) => createMutation.mutate(vals))}
        okButtonProps={{ loading: createMutation.isPending }}
        okText="Send"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Notification title" />
          </Form.Item>
          <Form.Item name="desc" label="Message" rules={[{ required: true, message: "Required" }]}>
            <Input.TextArea rows={3} placeholder="Notification message" />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select placeholder="Select type" allowClear
              options={[
                { value: "SYSTEM",  label: "System" },
                { value: "WARNING", label: "Warning" },
                { value: "SUCCESS", label: "Success" },
                { value: "ERROR",   label: "Error" },
              ]}
            />
          </Form.Item>
          <Form.Item name="accountId" label="Account ID (optional)">
            <Input placeholder="Leave empty to broadcast" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Low Stock Check Modal */}
      <Modal
        open={lowStockModal}
        title={<span><WarningOutlined style={{ color: "#d97706", marginRight: 8 }} />Low Stock Check</span>}
        onCancel={() => setLowStockModal(false)}
        onOk={() => {
          if (!lowStockStoreId) { message.warning("Select a store"); return; }
          lowStockQuery.refetch().then(() => message.success("Low stock notifications generated"));
        }}
        okButtonProps={{ loading: lowStockQuery.isFetching, style: { background: "#d97706", borderColor: "#d97706" } }}
        okText="Check & Notify"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Select store to check low stock:</div>
          <Select
            value={lowStockStoreId || undefined}
            onChange={setLowStockStoreId}
            style={{ width: "100%" }}
            options={stores.map((s: any) => ({ value: s.id, label: s.name }))}
          />
        </div>
        {lowStockItems.length > 0 && (
          <Table
            size="small"
            dataSource={lowStockItems}
            rowKey="id"
            pagination={false}
            scroll={{ y: 260 }}
            columns={[
              { title: "Product", key: "product", render: (_: any, r: any) => r.product?.name || "—" },
              { title: "Store", key: "store", render: (_: any, r: any) => r.store?.name || "—" },
              { title: "Stock", dataIndex: "stock", key: "stock", align: "center" as const, width: 80,
                render: (v: number) => <Tag color="orange">{v}</Tag> },
            ]}
          />
        )}
        {lowStockQuery.isFetched && lowStockItems.length === 0 && (
          <Alert type="success" message="No low stock items found for this store." />
        )}
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "Alt+N",  label: "Create notification" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
