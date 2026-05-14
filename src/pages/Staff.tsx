import React, { useState, useEffect } from "react";
import {
  Table, Button, Tag, Tooltip, message, Modal, Form, Input,
  Select, Popconfirm, Switch, Alert,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  LockOutlined, SafetyOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { staffService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "#7c3aed", MANAGER: "#2563eb", STAFF: "#059669", SALES_STAFF: "#d97706",
};

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const ROLE_OPTIONS = [
  { value: "STAFF",       label: "Staff" },
  { value: "MANAGER",     label: "Manager" },
  { value: "SALES_STAFF", label: "Sales Staff" },
];

export default function Staff() {
  const qc = useQueryClient();
  const [viewItem,   setViewItem]   = useState<any>(null);
  const [editItem,   setEditItem]   = useState<any>(null);
  const [createModal,setCreateModal]= useState(false);
  const [pwdItem,    setPwdItem]    = useState<any>(null);
  const [permItem,   setPermItem]   = useState<any>(null);
  const [createRole, setCreateRole] = useState<"STAFF" | "MANAGER" | "SALES_STAFF">("STAFF");
  const [form]    = Form.useForm();
  const [pwdForm] = Form.useForm();

  const listQuery = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => staffService.getAll().then((r) => r.data),
    staleTime: 30_000,
  });

  const permQuery = useQuery({
    queryKey: ["staff-perms", permItem?.id],
    queryFn: () => staffService.getPermissions(permItem.id).then((r) => r.data),
    enabled: !!permItem,
    staleTime: 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["staff-list"] });

  const createMutation = useMutation({
    mutationFn: (body: any) => {
      if (createRole === "MANAGER")     return staffService.addManager(body);
      if (createRole === "SALES_STAFF") return staffService.addSalesStaff(body);
      return staffService.addStaff(body);
    },
    onSuccess: () => { message.success("Staff created"); setCreateModal(false); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to create staff"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => staffService.update(id, body),
    onSuccess: () => { message.success("Updated"); setEditItem(null); form.resetFields(); invalidate(); },
    onError: () => message.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.delete(id),
    onSuccess: () => { message.success("Deleted"); invalidate(); },
    onError: () => message.error("Failed to delete"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => staffService.updateStatus(id, { status }),
    onSuccess: () => { message.success("Status updated"); invalidate(); },
    onError: () => message.error("Failed to update status"),
  });

  const pwdMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => staffService.updatePassword(id, body),
    onSuccess: () => { message.success("Password updated"); setPwdItem(null); pwdForm.resetFields(); },
    onError: () => message.error("Failed to update password"),
  });

  const permMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any[] }) => staffService.updatePermissions(id, body),
    onSuccess: () => { message.success("Permissions updated"); setPermItem(null); qc.invalidateQueries({ queryKey: ["staff-perms"] }); },
    onError: () => message.error("Failed to update permissions"),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    form.setFieldsValue({
      name: item.staffDetail?.[0]?.name,
      email: item.email,
      phone: item.phoneNumber,
      role: item.roles,
    });
  };

  const items: any[] = listQuery.data?.result || listQuery.data?.data || listQuery.data || [];

  const anyModalOpen = createModal || !!editItem || !!viewItem || !!pwdItem || !!permItem;
  const { rowClassName, onRow, focusedId } = usePageShortcuts({
    onNew: () => { form.resetFields(); setCreateModal(true); },
    isModalOpen: anyModalOpen,
    onCloseModal: () => { setCreateModal(false); setEditItem(null); setViewItem(null); setPwdItem(null); setPermItem(null); form.resetFields(); },
    onEdit: (r) => openEdit(r),
    items,
    isFetching: listQuery.isFetching,
  });

  // extra row shortcuts: V = view, P = password, M = permissions
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
      if (e.key === "p" || e.key === "P") { e.preventDefault(); setPwdItem(row); }
      if (e.key === "m" || e.key === "M") { e.preventDefault(); setPermItem(row); }
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
      title: "Staff", key: "name",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.staffDetail?.[0]?.name || "—"}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.email}</div>
        </div>
      ),
    },
    { title: "Phone", key: "phone", width: 130,
      render: (_: any, r: any) => r.phoneNumber || "—" },
    { title: "Role", key: "role", align: "center" as const, width: 130,
      render: (_: any, r: any) => {
        const role = r.roles;
        return <Tag style={{ background: ROLE_COLOR[role] || "#6b7280", color: "#fff", border: "none" }}>{role || "—"}</Tag>;
      },
    },
    { title: "Address", key: "address",
      render: (_: any, r: any) => <span style={{ fontSize: 12, color: "#6b7280" }}>{r.staffDetail?.[0]?.address || "—"}</span> },
    { title: "Status", key: "status", align: "center" as const, width: 90,
      render: (_: any, r: any) => (
        <Switch
          checked={r.status === "ACTIVE"} size="small"
          loading={statusMutation.isPending}
          onChange={(checked) => statusMutation.mutate({ id: r.id, status: checked ? "ACTIVE" : "INACTIVE" })}
        />
      ),
    },
    { title: "Joined", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    {
      title: "Actions", key: "actions", align: "center" as const, width: 200,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setViewItem(r)}>
              <kbd style={kbdRow}>V</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} style={{ color: "#2563eb", borderColor: "#2563eb" }} onClick={() => openEdit(r)}>
              <kbd style={kbdRow}>E</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Change Password">
            <Button size="small" icon={<LockOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }} onClick={() => setPwdItem(r)}>
              <kbd style={kbdRow}>P</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Permissions">
            <Button size="small" icon={<SafetyOutlined />} style={{ color: "#7c3aed", borderColor: "#7c3aed" }} onClick={() => setPermItem(r)}>
              <kbd style={kbdRow}>M</kbd>
            </Button>
          </Tooltip>
          <Popconfirm title="Delete this staff?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Group flat permissions array by menu
  const permList: any[] = Array.isArray(permQuery.data) ? permQuery.data : [];
  const menuMap: Record<string, { title: string; perms: Record<string, any> }> = {};
  for (const p of permList) {
    const key = p.menu?.name;
    if (!menuMap[key]) menuMap[key] = { title: p.menu?.title || key, perms: {} };
    menuMap[key].perms[p.permission?.name?.toLowerCase()] = p;
  }

  const handlePermToggle = (menuName: string, permName: string, checked: boolean) => {
    const updated = permList.map((p) =>
      p.menu?.name === menuName && p.permission?.name?.toLowerCase() === permName
        ? { ...p, status: checked }
        : p
    );
    qc.setQueryData(["staff-perms", permItem?.id], updated);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Staff</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage staff accounts and permissions</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={createRole} onChange={setCreateRole} options={ROLE_OPTIONS} style={{ width: 140 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateModal(true); }}
            style={{ background: "#2563eb" }}>
            Add Staff <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 }}>Alt+N</kbd>
          </Button>
        </div>
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load staff." style={{ marginBottom: 12 }} />}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table columns={columns} dataSource={items} rowKey="id"
          loading={listQuery.isFetching} size="middle" scroll={{ x: "max-content" }}
          pagination={{ pageSize: 15, showTotal: (t) => `Total ${t} staff` }}
          rowClassName={rowClassName} onRow={onRow} />
      </div>

      {/* View Modal */}
      <Modal open={!!viewItem} title="Staff Profile" footer={<Button onClick={() => setViewItem(null)}>Close</Button>} onCancel={() => setViewItem(null)}>
        {viewItem && (
          <div>
            {[
              ["Name",    viewItem.staffDetail?.[0]?.name],
              ["Email",   viewItem.email],
              ["Phone",   viewItem.phoneNumber],
              ["Role",    viewItem.roles],
              ["Address", viewItem.staffDetail?.[0]?.address || "—"],
              ["Status",  viewItem.status],
              ["Joined",  fmtDate(viewItem.createdAt)],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{val as string || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        open={createModal || !!editItem}
        title={editItem ? "Edit Staff" : `Add ${createRole.replace("_", " ")}`}
        onCancel={() => { setCreateModal(false); setEditItem(null); form.resetFields(); }}
        onOk={() => form.validateFields().then((vals) => {
          if (editItem) updateMutation.mutate({ id: editItem.id || editItem.staff?.id, body: vals });
          else createMutation.mutate(vals);
        })}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
        okText={editItem ? "Update" : "Create"}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Valid email required" }]}>
            <Input placeholder="Email address" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Phone number" />
          </Form.Item>
          {!editItem && (
            <Form.Item name="password" label="Password" rules={[{ required: true, message: "Required" }]}>
              <Input.Password placeholder="Password" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Password Modal */}
      <Modal
        open={!!pwdItem}
        title={`Change Password — ${pwdItem?.name || pwdItem?.staff?.name || ""}`}
        onCancel={() => { setPwdItem(null); pwdForm.resetFields(); }}
        onOk={() => pwdForm.validateFields().then((vals) => pwdMutation.mutate({ id: pwdItem.id, body: vals }))}
        okButtonProps={{ loading: pwdMutation.isPending }}
        okText="Update"
      >
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="password" label="New Password" rules={[{ required: true, min: 6, message: "Min 6 characters" }]}>
            <Input.Password placeholder="New password" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirm Password"
            rules={[{ required: true, message: "Required" }, ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) return Promise.resolve();
                return Promise.reject("Passwords do not match");
              },
            })]}>
            <Input.Password placeholder="Confirm password" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        open={!!permItem}
        title={`Permissions — ${permItem?.name || permItem?.staff?.name || ""}`}
        width={780}
        onCancel={() => setPermItem(null)}
        onOk={() => {
          const body = permList.map((p) => ({ id: p.id, status: p.status }));
          permMutation.mutate({ id: permItem.id, body });
        }}
        okButtonProps={{ loading: permMutation.isPending }}
        okText="Save"
      >
        {permQuery.isFetching
          ? <div style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>Loading permissions…</div>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Menu", "Read", "Create", "Update", "Delete"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: h === "Menu" ? "left" : "center", fontWeight: 600, color: "#374151", borderBottom: "2px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(menuMap).map(([menuName, { title, perms: mp }], i) => (
                    <tr key={menuName} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500, color: "#111827", borderBottom: "1px solid #f3f4f6" }}>{title}</td>
                      {["read", "create", "update", "delete"].map((perm) => (
                        <td key={perm} style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #f3f4f6" }}>
                          {mp[perm] ? (
                            <Switch
                              checked={!!mp[perm].status}
                              size="small"
                              onChange={(checked) => handlePermToggle(menuName, perm, checked)}
                              style={{ background: mp[perm].status ? "#059669" : undefined }}
                            />
                          ) : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "E",      label: "Edit focused staff" },
        { key: "V",      label: "View focused staff" },
        { key: "P",      label: "Change password" },
        { key: "M",      label: "Manage permissions" },
        { key: "Alt+N",  label: "Add new staff" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
