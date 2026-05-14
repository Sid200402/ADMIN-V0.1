import React, { useState, useRef, useEffect } from "react";
import {
  Table, Input, Tag, Typography, Select, Button, Modal, Form,
  Tooltip, Popconfirm, message, Switch, InputNumber, Tabs, Alert, Space,
} from "antd";
import {
  SearchOutlined, UserOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, EyeOutlined, DollarOutlined, DownloadOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { customerService, storeService } from "../api/services";
import type { ColumnType } from "antd/es/table";

import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const { Text } = Typography;

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtRs = (v: any) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

export default function Customers() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [storeId, setStoreId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [whatsappFilter, setWhatsappFilter] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [createModal, setCreateModal] = useState(false);
  const [dueModal, setDueModal] = useState<any>(null);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("");
  const [form] = Form.useForm();
  const [dueForm] = Form.useForm();

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
    queryKey: ["customers", page, keyword, storeId, statusFilter, whatsappFilter],
    queryFn: () => customerService.getAdminList({
      limit, offset: (page - 1) * limit,
      keyword: keyword || undefined,
      storeId: storeId || undefined,
      status: statusFilter || undefined,
      isOnWhatsapp: whatsappFilter || undefined,
    }).then((r) => r.data),
    staleTime: 30_000,
  });

  const duesQuery = useQuery({
    queryKey: ["customer-dues", storeId],
    queryFn: () => customerService.getDuesList(storeId || undefined).then((r) => r.data),
    enabled: activeTab === "dues",
    staleTime: 30_000,
  });

  const inquiriesQuery = useQuery({
    queryKey: ["customer-inquiries", inquiryStatusFilter],
    queryFn: () => customerService.getInquiries(inquiryStatusFilter || undefined).then((r) => r.data),
    enabled: activeTab === "inquiries",
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["customer-dues"] });
  };

  const createMutation = useMutation({
    mutationFn: (body: any) => customerService.create(body),
    onSuccess: () => { message.success("Customer created"); setCreateModal(false); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to create customer"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => customerService.update(id, body),
    onSuccess: () => { message.success("Customer updated"); setEditItem(null); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to update customer"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => { message.success("Deleted"); invalidate(); },
    onError: () => message.error("Failed to delete"),
  });

  const whatsappMutation = useMutation({
    mutationFn: ({ id, isOnWhatsapp }: { id: string; isOnWhatsapp: boolean }) =>
      customerService.updateWhatsapp(id, isOnWhatsapp),
    onSuccess: () => { message.success("WhatsApp status updated"); invalidate(); },
    onError: () => message.error("Failed to update WhatsApp status"),
  });

  const dueMutation = useMutation({
    mutationFn: ({ customerId, amount }: { customerId: string; amount: number }) =>
      customerService.updateDue(customerId, amount),
    onSuccess: (data) => {
      message.success(`Payment applied. New due: ${fmtRs(data.data?.newTotalDue)}`);
      setDueModal(null);
      dueForm.resetFields();
      invalidate();
    },
    onError: () => message.error("Failed to apply payment"),
  });

  const updateInquiryMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => customerService.updateInquiry(id, body),
    onSuccess: () => { message.success("Inquiry updated"); qc.invalidateQueries({ queryKey: ["customer-inquiries"] }); },
    onError: () => message.error("Failed to update inquiry"),
  });

  const handleDownloadInvoice = async (r: any) => {
    try {
      const res = await customerService.downloadInvoice(r.storeId || storeId, r.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `invoice_${r.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error("Failed to download invoice"); }
  };

  const openEdit = (r: any) => {
    setEditItem(r);
    form.setFieldsValue({ name: r.name, phone: r.phone, email: r.email, address: r.address, priceGroupId: r.priceGroupId });
  };

  const items: any[] = listQuery.data?.result || [];
  const total: number = listQuery.data?.total || 0;
  const dueItems: any[] = duesQuery.data?.result || [];
  const inquiryItems: any[] = Array.isArray(inquiriesQuery.data) ? inquiriesQuery.data : [];

  const anyModalOpen = createModal || !!editItem || !!viewItem || !!dueModal;
  const { searchRef, rowClassName, onRow, searchInputProps, focusedId } = usePageShortcuts({
    onNew: () => { form.resetFields(); setCreateModal(true); },
    isModalOpen: anyModalOpen,
    onCloseModal: () => { setCreateModal(false); setEditItem(null); setViewItem(null); setDueModal(null); form.resetFields(); },
    onEdit: (r) => openEdit(r),
    items,
    isFetching: listQuery.isFetching,
  });

  // extra row shortcuts: V=view, D=pay due, I=invoice, W=whatsapp toggle
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
      if (e.key === "d" || e.key === "D") { e.preventDefault(); setDueModal(row); dueForm.resetFields(); }
      if (e.key === "i" || e.key === "I") { e.preventDefault(); handleDownloadInvoice(row); }
      if (e.key === "w" || e.key === "W") { e.preventDefault(); whatsappMutation.mutate({ id: row.id, isOnWhatsapp: !row.isOnWhatsapp }); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [anyModalOpen, focusedId, items]);

  const kbdRow: React.CSSProperties = {
    background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3,
    padding: "0 4px", fontFamily: "monospace", fontSize: 10, color: "#475569",
    lineHeight: "16px", display: "inline-block",
  };

  const columns: ColumnType<any>[] = [
    {
      title: "Customer", key: "name",
      render: (_: any, r: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserOutlined style={{ color: "#2563eb" }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name || "—"}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.phone}</div>
          </div>
        </div>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email", render: (v: string) => v || "—" },
    { title: "Store", key: "store", render: (_: any, r: any) => r.store?.name || "—" },
    { title: "Price Group", key: "priceGroup", render: (_: any, r: any) => r.priceGroup?.name ? <Tag color="blue">{r.priceGroup.name}</Tag> : "—" },
    {
      title: "WhatsApp", key: "whatsapp", align: "center" as const, width: 100,
      render: (_: any, r: any) => (
        <Switch
          checked={!!r.isOnWhatsapp}
          checkedChildren={<WhatsAppOutlined />}
          unCheckedChildren="No"
          loading={whatsappMutation.isPending}
          onChange={(v) => whatsappMutation.mutate({ id: r.id, isOnWhatsapp: v })}
          style={{ background: r.isOnWhatsapp ? "#25d366" : undefined }}
        />
      ),
    },
    { title: "Total Purchases", dataIndex: "totalPurchases", key: "totalPurchases", align: "right" as const, width: 130,
      render: (v: any) => <Text style={{ color: "#059669", fontWeight: 600 }}>{fmtRs(v)}</Text> },
    { title: "Due", dataIndex: "totalDue", key: "totalDue", align: "right" as const, width: 110,
      render: (v: any) => <Text style={{ color: Number(v) > 0 ? "#dc2626" : "#6b7280", fontWeight: 600 }}>{fmtRs(v)}</Text> },
    { title: "Joined", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    {
      title: "Status", key: "status", align: "center" as const, width: 90,
      render: (_: any, r: any) => (
        <Tag style={{ background: r.status === true || r.status === "true" ? "#059669" : "#6b7280", color: "#fff", border: "none" }}>
          {r.status === true || r.status === "true" ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions", key: "actions", align: "center" as const, width: 180,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setViewItem(r)}><kbd style={kbdRow}>V</kbd></Button></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} style={{ color: "#2563eb", borderColor: "#2563eb" }} onClick={() => openEdit(r)}><kbd style={kbdRow}>E</kbd></Button></Tooltip>
          <Tooltip title="Pay Due">
            <Button size="small" icon={<DollarOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }}
              onClick={() => { setDueModal(r); dueForm.resetFields(); }}><kbd style={kbdRow}>D</kbd></Button>
          </Tooltip>
          <Tooltip title="Download Invoice">
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadInvoice(r)}><kbd style={kbdRow}>I</kbd></Button>
          </Tooltip>
          <Tooltip title="Toggle WhatsApp">
            <Button size="small" icon={<WhatsAppOutlined />}
              style={{ color: r.isOnWhatsapp ? "#25d366" : undefined, borderColor: r.isOnWhatsapp ? "#25d366" : undefined }}
              onClick={() => whatsappMutation.mutate({ id: r.id, isOnWhatsapp: !r.isOnWhatsapp })}><kbd style={kbdRow}>W</kbd></Button>
          </Tooltip>
          <Popconfirm title="Delete this customer?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const dueColumns: ColumnType<any>[] = [
    {
      title: "Customer", key: "name",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.phone}</div>
        </div>
      ),
    },
    { title: "Total Purchases", dataIndex: "totalPurchases", key: "totalPurchases", align: "right" as const, render: fmtRs },
    { title: "Total Due", dataIndex: "totalDue", key: "totalDue", align: "right" as const,
      render: (v: any) => <Text style={{ color: "#dc2626", fontWeight: 700 }}>{fmtRs(v)}</Text> },
    { title: "Last Payment", dataIndex: "lastPaymentDate", key: "lastPaymentDate", width: 120, render: fmtDate },
    {
      title: "Actions", key: "actions", align: "center" as const, width: 120,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Pay Due">
            <Button size="small" icon={<DollarOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }}
              onClick={() => { setDueModal(r); dueForm.resetFields(); }} />
          </Tooltip>
          <Tooltip title="Download Invoice">
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadInvoice(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const inquiryColumns: ColumnType<any>[] = [
    { title: "Customer", key: "customer", render: (_: any, r: any) => r.customer?.name || "—" },
    { title: "Subject", dataIndex: "subject", key: "subject" },
    { title: "Message", dataIndex: "message", key: "message", render: (v: string) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v}</span> },
    {
      title: "Status", key: "status", align: "center" as const, width: 110,
      render: (_: any, r: any) => (
        <Select
          value={r.status}
          size="small"
          style={{ width: 120 }}
          onChange={(v) => updateInquiryMutation.mutate({ id: r.id, body: { status: v } })}
          options={[
            { value: "OPEN", label: "Open" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "CLOSED", label: "Closed" },
          ]}
        />
      ),
    },
    { title: "Date", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
  ];

  const customerForm = (
    <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Form.Item name="name" label="Name" rules={[{ required: true, message: "Required" }]}>
          <Input placeholder="Customer name" />
        </Form.Item>
        <Form.Item name="phone" label="Phone" rules={[{ required: true, message: "Required" }]}>
          <Input placeholder="Phone number" />
        </Form.Item>
      </div>
      <Form.Item name="email" label="Email">
        <Input placeholder="Email address" />
      </Form.Item>
      <Form.Item name="address" label="Address">
        <Input.TextArea rows={2} placeholder="Address" />
      </Form.Item>
      {createModal && (
        <Form.Item name="storeId" label="Store" rules={[{ required: true, message: "Required" }]}
          initialValue={storeId}>
          <Select options={stores.map((s: any) => ({ value: s.id, label: s.name }))} />
        </Form.Item>
      )}
    </Form>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Customers</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage all customers</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateModal(true); }}
          style={{ background: "#2563eb" }}>
          Add Customer <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 }}>Alt+N</kbd>
        </Button>
      </div>

      <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k); setPage(1); }} items={[
        {
          key: "list",
          label: "All Customers",
          children: (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 14, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <Input
                  prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="Search name, phone, email…"
                  value={searchInput}
                  ref={searchRef}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => { setKeyword(e.target.value); setPage(1); }, 500);
                  }}
                  allowClear onClear={() => { setKeyword(""); setPage(1); }}
                  style={{ width: 260 }}
                  {...searchInputProps}
                />
                <Select
                  value={storeId || undefined} onChange={(v) => { setStoreId(v || ""); setPage(1); }}
                  placeholder="All Stores" allowClear style={{ width: 180 }}
                  options={stores.map((s: any) => ({ value: s.id, label: s.name }))}
                />
                <Select
                  value={statusFilter || undefined} onChange={(v) => { setStatusFilter(v || ""); setPage(1); }}
                  placeholder="All Status" allowClear style={{ width: 130 }}
                  options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]}
                />
                <Select
                  value={whatsappFilter || undefined} onChange={(v) => { setWhatsappFilter(v || ""); setPage(1); }}
                  placeholder="WhatsApp" allowClear style={{ width: 130 }}
                  options={[{ value: "true", label: "On WhatsApp" }, { value: "false", label: "Not on WhatsApp" }]}
                />
                {(keyword || statusFilter || whatsappFilter) && (
                  <Button onClick={() => { setSearchInput(""); setKeyword(""); setStatusFilter(""); setWhatsappFilter(""); setPage(1); }}>Clear</Button>
                )}
              </div>
              {listQuery.isError && <Alert type="error" message="Failed to load customers." style={{ marginBottom: 12 }} />}
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table
                  columns={columns} dataSource={items} rowKey="id"
                  loading={listQuery.isFetching} size="middle" scroll={{ x: "max-content" }}
                  pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: (t) => `Total ${t}` }}
                  rowClassName={rowClassName} onRow={onRow}
                />
              </div>
            </>
          ),
        },
        {
          key: "dues",
          label: "Customer Dues",
          children: (
            <>
              {duesQuery.isError && <Alert type="error" message="Failed to load dues." style={{ marginBottom: 12 }} />}
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table
                  columns={dueColumns} dataSource={dueItems} rowKey="id"
                  loading={duesQuery.isFetching} size="middle" scroll={{ x: "max-content" }}
                  pagination={{ pageSize: 20, showTotal: (t) => `Total ${t}` }}
                />
              </div>
            </>
          ),
        },
        {
          key: "inquiries",
          label: "Inquiries",
          children: (
            <>
              <div style={{ marginBottom: 12 }}>
                <Select
                  value={inquiryStatusFilter || undefined}
                  onChange={(v) => setInquiryStatusFilter(v || "")}
                  placeholder="All Status" allowClear style={{ width: 160 }}
                  options={[
                    { value: "OPEN", label: "Open" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "RESOLVED", label: "Resolved" },
                    { value: "CLOSED", label: "Closed" },
                  ]}
                />
              </div>
              {inquiriesQuery.isError && <Alert type="error" message="Failed to load inquiries." style={{ marginBottom: 12 }} />}
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table
                  columns={inquiryColumns} dataSource={inquiryItems} rowKey="id"
                  loading={inquiriesQuery.isFetching} size="middle" scroll={{ x: "max-content" }}
                  pagination={{ pageSize: 20, showTotal: (t) => `Total ${t}` }}
                />
              </div>
            </>
          ),
        },
      ]} />

      {/* View Modal */}
      <Modal open={!!viewItem} title="Customer Details"
        footer={<Button onClick={() => setViewItem(null)}>Close</Button>}
        onCancel={() => setViewItem(null)}>
        {viewItem && (
          <div>
            {[
              ["Name", viewItem.name],
              ["Phone", viewItem.phone],
              ["Email", viewItem.email || "—"],
              ["Address", viewItem.address || "—"],
              ["Store", viewItem.store?.name || "—"],
              ["Price Group", viewItem.priceGroup?.name || "—"],
              ["WhatsApp", viewItem.isOnWhatsapp ? "Yes" : "No"],
              ["Total Purchases", fmtRs(viewItem.totalPurchases)],
              ["Total Due", fmtRs(viewItem.totalDue)],
              ["Last Payment", fmtDate(viewItem.lastPaymentDate)],
              ["Joined", fmtDate(viewItem.createdAt)],
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
        title={editItem ? "Edit Customer" : "Add Customer"}
        onCancel={() => { setCreateModal(false); setEditItem(null); form.resetFields(); }}
        onOk={() => form.validateFields().then((vals) => {
          if (editItem) updateMutation.mutate({ id: editItem.id, body: vals });
          else createMutation.mutate({ ...vals, storeId: vals.storeId || storeId });
        })}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
        okText={editItem ? "Update" : "Create"}
      >
        {customerForm}
      </Modal>

      {/* Pay Due Modal */}
      <Modal
        open={!!dueModal}
        title="Apply Payment"
        onCancel={() => { setDueModal(null); dueForm.resetFields(); }}
        onOk={() => dueForm.validateFields().then((vals) => dueMutation.mutate({ customerId: dueModal.id, amount: vals.amount }))}
        okButtonProps={{ loading: dueMutation.isPending, style: { background: "#059669" } }}
        okText="Apply Payment"
      >
        <div style={{ marginBottom: 12, color: "#6b7280" }}>
          Customer: <strong>{dueModal?.name}</strong> — Current Due: <strong style={{ color: "#dc2626" }}>{fmtRs(dueModal?.totalDue)}</strong>
        </div>
        <Form form={dueForm} layout="vertical">
          <Form.Item name="amount" label="Payment Amount" rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={0.01} precision={2} style={{ width: "100%" }} prefix="₹" />
          </Form.Item>
        </Form>
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "V",      label: "View customer" },
        { key: "E",      label: "Edit customer" },
        { key: "D",      label: "Pay due" },
        { key: "I",      label: "Download invoice" },
        { key: "W",      label: "Toggle WhatsApp" },
        { key: "Alt+N",  label: "Add new customer" },
        { key: "Alt+S",  label: "Focus search" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
