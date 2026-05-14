import { useState } from "react";
import {
  Table, Button, Select, Tag, Tooltip, message, Modal,
  Alert, Popconfirm, Tabs, Badge, Space,
} from "antd";
import {
  EyeOutlined, DeleteOutlined, DownloadOutlined, CheckOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { productRequestService, categoryService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d97706",
  PURCHASED: "#059669",
  REJECTED: "#dc2626",
};

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ProductRequests() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [viewItem, setViewItem] = useState<any>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories-search"],
    queryFn: () => categoryService.search(),
    staleTime: 300_000,
  });
  const categories: any[] = categoriesQuery.data || [];

  const listQuery = useQuery({
    queryKey: ["product-requests", statusFilter, categoryFilter],
    queryFn: () =>
      productRequestService.getList({ status: statusFilter, categoryId: categoryFilter, limit: 100 }).then((r) => r.data),
    staleTime: 30_000,
  });

  const categoryQuery = useQuery({
    queryKey: ["product-requests-category", statusFilter],
    queryFn: () =>
      productRequestService.getCategoryWise({ status: statusFilter }).then((r) => r.data),
    enabled: activeTab === "category",
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["product-requests"] });
    qc.invalidateQueries({ queryKey: ["product-requests-category"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      productRequestService.updateStatus(id, status),
    onSuccess: () => { message.success("Status updated"); invalidate(); },
    onError: () => message.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productRequestService.delete(id),
    onSuccess: () => { message.success("Deleted"); invalidate(); },
    onError: () => message.error("Failed to delete"),
  });

  const handleDownload = async () => {
    try {
      const res = await productRequestService.downloadCategoryWise({ status: statusFilter });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `product-requests-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("Download failed");
    }
  };

  const items: any[] = listQuery.data?.result || [];
  const categoryItems: any[] = Array.isArray(categoryQuery.data) ? categoryQuery.data : [];

  const { rowClassName, onRow } = usePageShortcuts({
    onNew: () => {},
    isModalOpen: !!viewItem,
    onCloseModal: () => setViewItem(null),
    onEdit: (r) => setViewItem(r),
    items,
    isFetching: listQuery.isFetching,
  });

  const statusSelect = (
    <Select
      allowClear
      placeholder="All Status"
      style={{ width: 160 }}
      value={statusFilter}
      onChange={(v) => setStatusFilter(v)}
      options={[
        { value: "PENDING", label: "Pending" },
        { value: "PURCHASED", label: "Purchased" },
        { value: "REJECTED", label: "Rejected" },
      ]}
    />
  );

  const categorySelect = (
    <Select
      allowClear
      showSearch
      placeholder="All Categories"
      style={{ width: 200 }}
      value={categoryFilter}
      onChange={(v) => setCategoryFilter(v)}
      filterOption={(input, opt) =>
        (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
      }
      options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
    />
  );

  const actionButtons = (r: any) => (
    <Space size={4}>
      <Tooltip title="View">
        <Button size="small" icon={<EyeOutlined />} onClick={() => setViewItem(r)} />
      </Tooltip>
      {r.status === "PENDING" && (
        <Tooltip title="Mark Purchased">
          <Button
            size="small"
            icon={<CheckOutlined />}
            style={{ color: "#059669", borderColor: "#059669" }}
            loading={statusMutation.isPending}
            onClick={() => statusMutation.mutate({ id: r.id, status: "PURCHASED" })}
          />
        </Tooltip>
      )}
      <Popconfirm title="Delete this request?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
        <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
      </Popconfirm>
    </Space>
  );

  const columns: ColumnType<any>[] = [
    { title: "Staff", key: "staff", render: (_: any, r: any) => r.staff?.name || "—" },
    { title: "Category", key: "category", render: (_: any, r: any) => r.category?.name || "—" },
    {
      title: "Products", key: "products",
      render: (_: any, r: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(r.products || []).map((p: any, i: number) => (
            <span key={i} style={{ fontSize: 12 }}>
              <strong>{p.name}</strong> × {p.quantity}
              {p.notes && <span style={{ color: "#9ca3af" }}> ({p.notes})</span>}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Status", key: "status", align: "center" as const, width: 120,
      render: (_: any, r: any) => (
        <Tag style={{ background: STATUS_COLOR[r.status] || "#6b7280", color: "#fff", border: "none" }}>
          {r.status}
        </Tag>
      ),
    },
    { title: "Date", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    { title: "Actions", key: "actions", align: "center" as const, width: 120, render: (_: any, r: any) => actionButtons(r) },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Product Requests</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Staff product purchase requests</div>
        </div>
        <Space>
          {categorySelect}
          {statusSelect}
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            Download Excel
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: (
              <span>
                All Requests{" "}
                {listQuery.data?.total ? <Badge count={listQuery.data.total} style={{ background: "#2563eb" }} /> : null}
              </span>
            ),
            children: (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                {listQuery.isError && <Alert type="error" message="Failed to load requests." style={{ margin: 16 }} />}
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
            key: "category",
            label: "Category Wise",
            children: (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {categoryQuery.isError && <Alert type="error" message="Failed to load." />}
                {categoryQuery.isFetching
                  ? <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading…</div>
                  : categoryItems.length === 0
                    ? <Alert type="info" message="No requests found." />
                    : categoryItems.map((cat: any) => (
                      <div key={cat.categoryId} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{cat.categoryName}</span>
                          <Badge count={cat.requests?.length || 0} style={{ background: "#2563eb" }} />
                        </div>
                        <Table
                          columns={columns}
                          dataSource={cat.requests || []}
                          rowKey="id"
                          size="small"
                          pagination={false}
                          scroll={{ x: "max-content" }}
                        />
                      </div>
                    ))
                }
              </div>
            ),
          },
        ]}
      />

      {/* View Modal */}
      <Modal
        open={!!viewItem}
        title="Request Details"
        footer={<Button onClick={() => setViewItem(null)}>Close</Button>}
        onCancel={() => setViewItem(null)}
      >
        {viewItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Staff", viewItem.staff?.name],
              ["Category", viewItem.category?.name],
              ["Status", viewItem.status],
              ["Date", fmtDate(viewItem.createdAt)],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{val as string || "—"}</span>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Products</div>
              {(viewItem.products || []).map((p: any, i: number) => (
                <div key={i} style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name} <span style={{ color: "#2563eb" }}>× {p.quantity}</span></div>
                  {p.notes && <div style={{ fontSize: 12, color: "#9ca3af" }}>{p.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "E",      label: "View details" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
