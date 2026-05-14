import { useState } from "react";
import {
  Table, Button, Tag, Tooltip, message, Modal, Form, Input,
  Select, Popconfirm, Tabs, Upload, Alert, Switch,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined,
  CheckOutlined, CloseOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { bannersService } from "../api/services";
import type { ColumnType } from "antd/es/table";

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function BannersAds() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("banners");

  // Banner state
  const [bannerModal, setBannerModal] = useState(false);
  const [editBanner,  setEditBanner]  = useState<any>(null);
  const [imgBanner,   setImgBanner]   = useState<any>(null);
  const [imgFile,     setImgFile]     = useState<File | null>(null);
  const [bannerForm]  = Form.useForm();

  // Blog state
  const [blogModal,  setBlogModal]  = useState(false);
  const [editBlog,   setEditBlog]   = useState<any>(null);
  const [imgBlog,    setImgBlog]    = useState<any>(null);
  const [blogImgFile,setBlogImgFile]= useState<File | null>(null);
  const [blogForm]   = Form.useForm();

  // Featured state
  const [featModal,  setFeatModal]  = useState(false);
  const [featForm]   = Form.useForm();
  const [selectedIds,setSelectedIds]= useState<string[]>([]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const bannersQ  = useQuery({ queryKey: ["banners"],   queryFn: () => bannersService.getBanners().then(r => r.data),  enabled: activeTab === "banners",   staleTime: 30_000 });
  const blogsQ    = useQuery({ queryKey: ["blogs"],     queryFn: () => bannersService.getBlogs().then(r => r.data),    enabled: activeTab === "blogs",     staleTime: 30_000 });
  const featuredQ = useQuery({ queryKey: ["featured"],  queryFn: () => bannersService.getFeatured().then(r => r.data), enabled: activeTab === "featured",  staleTime: 30_000 });

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key] });

  // ── Banner mutations ──────────────────────────────────────────────────────
  const createBannerM = useMutation({
    mutationFn: (body: any) => editBanner ? bannersService.updateBanner(editBanner.id, body) : bannersService.createBanner(body),
    onSuccess: () => { message.success(editBanner ? "Updated" : "Created"); setBannerModal(false); setEditBanner(null); bannerForm.resetFields(); invalidate("banners"); },
    onError: () => message.error("Failed"),
  });
  const deleteBannerM = useMutation({
    mutationFn: (id: string) => bannersService.deleteBanner(id),
    onSuccess: () => { message.success("Deleted"); invalidate("banners"); },
    onError: () => message.error("Failed to delete"),
  });
  const uploadBannerM = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => bannersService.uploadBannerImage(id, file),
    onSuccess: () => { message.success("Image uploaded"); setImgBanner(null); setImgFile(null); invalidate("banners"); },
    onError: () => message.error("Upload failed"),
  });
  const bulkActivateM   = useMutation({ mutationFn: (ids: string[]) => bannersService.bulkActivate({ ids }),   onSuccess: () => { message.success("Activated");   setSelectedIds([]); invalidate("banners"); } });
  const bulkDeactivateM = useMutation({ mutationFn: (ids: string[]) => bannersService.bulkDeactivate({ ids }), onSuccess: () => { message.success("Deactivated"); setSelectedIds([]); invalidate("banners"); } });

  // ── Blog mutations ────────────────────────────────────────────────────────
  const createBlogM = useMutation({
    mutationFn: (body: any) => editBlog ? bannersService.updateBlog(editBlog.id, body) : bannersService.createBlog(body),
    onSuccess: () => { message.success(editBlog ? "Updated" : "Created"); setBlogModal(false); setEditBlog(null); blogForm.resetFields(); invalidate("blogs"); },
    onError: () => message.error("Failed"),
  });
  const deleteBlogM = useMutation({
    mutationFn: (id: string) => bannersService.deleteBlog(id),
    onSuccess: () => { message.success("Deleted"); invalidate("blogs"); },
    onError: () => message.error("Failed to delete"),
  });
  const uploadBlogM = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => bannersService.uploadBlogImage(id, file),
    onSuccess: () => { message.success("Image uploaded"); setImgBlog(null); setBlogImgFile(null); invalidate("blogs"); },
    onError: () => message.error("Upload failed"),
  });

  // ── Featured mutations ────────────────────────────────────────────────────
  const addFeaturedM = useMutation({
    mutationFn: (body: any) => bannersService.addFeatured(body),
    onSuccess: () => { message.success("Added to featured"); setFeatModal(false); featForm.resetFields(); invalidate("featured"); },
    onError: () => message.error("Failed"),
  });
  const deleteFeaturedM = useMutation({
    mutationFn: (id: string) => bannersService.deleteFeatured(id),
    onSuccess: () => { message.success("Removed"); invalidate("featured"); },
    onError: () => message.error("Failed"),
  });

  const getList = (q: any) => q.data?.result || q.data?.data || q.data || [];

  // ── Banner columns ────────────────────────────────────────────────────────
  const bannerCols: ColumnType<any>[] = [
    { title: "Image", key: "image", width: 80,
      render: (_: any, r: any) => r.imageUrl
        ? <img src={r.imageUrl} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 6 }} />
        : <div style={{ width: 60, height: 40, background: "#f1f5f9", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><PictureOutlined style={{ color: "#9ca3af" }} /></div>,
    },
    { title: "Title", dataIndex: "title", key: "title", render: (v: string) => <span style={{ fontWeight: 600 }}>{v || "—"}</span> },
    { title: "Type", dataIndex: "type", key: "type", width: 100, render: (v: string) => v ? <Tag color="blue">{v}</Tag> : "—" },
    { title: "Status", key: "status", align: "center" as const, width: 90,
      render: (_: any, r: any) => <Tag style={{ background: r.isActive ? "#059669" : "#6b7280", color: "#fff", border: "none" }}>{r.isActive ? "Active" : "Inactive"}</Tag> },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    { title: "Actions", key: "actions", align: "center" as const, width: 160,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} style={{ color: "#2563eb", borderColor: "#2563eb" }}
              onClick={() => { setEditBanner(r); bannerForm.setFieldsValue({ title: r.title, type: r.type, link: r.link, isActive: r.isActive }); setBannerModal(true); }} />
          </Tooltip>
          <Tooltip title="Upload Image">
            <Button size="small" icon={<PictureOutlined />} style={{ color: "#7c3aed", borderColor: "#7c3aed" }} onClick={() => setImgBanner(r)} />
          </Tooltip>
          <Popconfirm title="Delete this banner?" onConfirm={() => deleteBannerM.mutate(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  // ── Blog columns ──────────────────────────────────────────────────────────
  const blogCols: ColumnType<any>[] = [
    { title: "Image", key: "image", width: 80,
      render: (_: any, r: any) => r.imageUrl
        ? <img src={r.imageUrl} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 6 }} />
        : <div style={{ width: 60, height: 40, background: "#f1f5f9", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><PictureOutlined style={{ color: "#9ca3af" }} /></div>,
    },
    { title: "Title", dataIndex: "title", key: "title", render: (v: string) => <span style={{ fontWeight: 600 }}>{v || "—"}</span> },
    { title: "Category", dataIndex: "category", key: "category", width: 120, render: (v: string) => v ? <Tag color="purple">{v}</Tag> : "—" },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    { title: "Actions", key: "actions", align: "center" as const, width: 130,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} style={{ color: "#2563eb", borderColor: "#2563eb" }}
              onClick={() => { setEditBlog(r); blogForm.setFieldsValue({ title: r.title, category: r.category, content: r.content }); setBlogModal(true); }} />
          </Tooltip>
          <Tooltip title="Upload Image">
            <Button size="small" icon={<PictureOutlined />} style={{ color: "#7c3aed", borderColor: "#7c3aed" }} onClick={() => setImgBlog(r)} />
          </Tooltip>
          <Popconfirm title="Delete this blog?" onConfirm={() => deleteBlogM.mutate(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  // ── Featured columns ──────────────────────────────────────────────────────
  const featCols: ColumnType<any>[] = [
    { title: "Order", dataIndex: "order", key: "order", align: "center" as const, width: 70 },
    { title: "Product", key: "product",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.product?.name || "—"}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.product?.sku}</div>
        </div>
      ),
    },
    { title: "Added", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
    { title: "Remove", key: "remove", align: "center" as const, width: 80,
      render: (_: any, r: any) => (
        <Popconfirm title="Remove from featured?" onConfirm={() => deleteFeaturedM.mutate(r.id)} okText="Yes" cancelText="No">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const bannerItems = getList(bannersQ);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Banners & Ads</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage banners, blogs and featured products</div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        // ── Banners ──────────────────────────────────────────────────────────
        {
          key: "banners", label: "Banners",
          children: (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditBanner(null); bannerForm.resetFields(); setBannerModal(true); }} style={{ background: "#2563eb" }}>
                  Add Banner
                </Button>
                {selectedIds.length > 0 && (
                  <>
                    <Button icon={<CheckOutlined />} style={{ color: "#059669", borderColor: "#059669" }} onClick={() => bulkActivateM.mutate(selectedIds)} loading={bulkActivateM.isPending}>
                      Activate ({selectedIds.length})
                    </Button>
                    <Button icon={<CloseOutlined />} style={{ color: "#dc2626", borderColor: "#dc2626" }} onClick={() => bulkDeactivateM.mutate(selectedIds)} loading={bulkDeactivateM.isPending}>
                      Deactivate ({selectedIds.length})
                    </Button>
                  </>
                )}
              </div>
              {bannersQ.isError && <Alert type="error" message="Failed to load banners." style={{ marginBottom: 12 }} />}
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table
                  columns={bannerCols} dataSource={bannerItems} rowKey="id"
                  loading={bannersQ.isFetching} size="middle"
                  rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys as string[]) }}
                  pagination={{ pageSize: 10, showTotal: (t) => `Total ${t}` }}
                />
              </div>
            </div>
          ),
        },

        // ── Blogs ─────────────────────────────────────────────────────────────
        {
          key: "blogs", label: "Blogs",
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditBlog(null); blogForm.resetFields(); setBlogModal(true); }} style={{ background: "#7c3aed" }}>
                  Add Blog
                </Button>
              </div>
              {blogsQ.isError && <Alert type="error" message="Failed to load blogs." style={{ marginBottom: 12 }} />}
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table columns={blogCols} dataSource={getList(blogsQ)} rowKey="id"
                  loading={blogsQ.isFetching} size="middle"
                  pagination={{ pageSize: 10, showTotal: (t) => `Total ${t}` }} />
              </div>
            </div>
          ),
        },

        // ── Featured Products ─────────────────────────────────────────────────
        {
          key: "featured", label: "Featured Products",
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { featForm.resetFields(); setFeatModal(true); }} style={{ background: "#059669" }}>
                  Add Featured
                </Button>
              </div>
              {featuredQ.isError && <Alert type="error" message="Failed to load featured products." style={{ marginBottom: 12 }} />}
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table columns={featCols} dataSource={getList(featuredQ)} rowKey="id"
                  loading={featuredQ.isFetching} size="middle"
                  pagination={{ pageSize: 10, showTotal: (t) => `Total ${t}` }} />
              </div>
            </div>
          ),
        },
      ]} />

      {/* Banner Create/Edit Modal */}
      <Modal
        open={bannerModal}
        title={editBanner ? "Edit Banner" : "Add Banner"}
        onCancel={() => { setBannerModal(false); setEditBanner(null); bannerForm.resetFields(); }}
        onOk={() => bannerForm.validateFields().then((vals) => createBannerM.mutate(vals))}
        okButtonProps={{ loading: createBannerM.isPending }}
        okText={editBanner ? "Update" : "Create"}
      >
        <Form form={bannerForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Banner title" />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select placeholder="Select type" allowClear
              options={[{ value: "HERO", label: "Hero" }, { value: "PROMO", label: "Promo" }, { value: "SIDEBAR", label: "Sidebar" }]} />
          </Form.Item>
          <Form.Item name="link" label="Link URL">
            <Input placeholder="https://…" />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Banner Image Upload Modal */}
      <Modal
        open={!!imgBanner}
        title={`Upload Image — ${imgBanner?.title || ""}`}
        onCancel={() => { setImgBanner(null); setImgFile(null); }}
        onOk={() => { if (imgFile && imgBanner) uploadBannerM.mutate({ id: imgBanner.id, file: imgFile }); }}
        okButtonProps={{ loading: uploadBannerM.isPending, disabled: !imgFile }}
        okText="Upload"
      >
        <Upload.Dragger accept="image/*" maxCount={1} beforeUpload={(f) => { setImgFile(f); return false; }} onRemove={() => setImgFile(null)}>
          <p style={{ fontSize: 28 }}><PictureOutlined /></p>
          <p style={{ fontSize: 13 }}>Click or drag image here</p>
        </Upload.Dragger>
      </Modal>

      {/* Blog Create/Edit Modal */}
      <Modal
        open={blogModal}
        title={editBlog ? "Edit Blog" : "Add Blog"}
        onCancel={() => { setBlogModal(false); setEditBlog(null); blogForm.resetFields(); }}
        onOk={() => blogForm.validateFields().then((vals) => createBlogM.mutate(vals))}
        okButtonProps={{ loading: createBlogM.isPending }}
        okText={editBlog ? "Update" : "Create"}
      >
        <Form form={blogForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Blog title" />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input placeholder="e.g. News, Tips" />
          </Form.Item>
          <Form.Item name="content" label="Content">
            <Input.TextArea rows={4} placeholder="Blog content…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Blog Image Upload Modal */}
      <Modal
        open={!!imgBlog}
        title={`Upload Image — ${imgBlog?.title || ""}`}
        onCancel={() => { setImgBlog(null); setBlogImgFile(null); }}
        onOk={() => { if (blogImgFile && imgBlog) uploadBlogM.mutate({ id: imgBlog.id, file: blogImgFile }); }}
        okButtonProps={{ loading: uploadBlogM.isPending, disabled: !blogImgFile }}
        okText="Upload"
      >
        <Upload.Dragger accept="image/*" maxCount={1} beforeUpload={(f) => { setBlogImgFile(f); return false; }} onRemove={() => setBlogImgFile(null)}>
          <p style={{ fontSize: 28 }}><PictureOutlined /></p>
          <p style={{ fontSize: 13 }}>Click or drag image here</p>
        </Upload.Dragger>
      </Modal>

      {/* Add Featured Modal */}
      <Modal
        open={featModal}
        title="Add Featured Product"
        onCancel={() => { setFeatModal(false); featForm.resetFields(); }}
        onOk={() => featForm.validateFields().then((vals) => addFeaturedM.mutate(vals))}
        okButtonProps={{ loading: addFeaturedM.isPending }}
        okText="Add"
      >
        <Form form={featForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="productId" label="Product ID" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Enter product ID" />
          </Form.Item>
          <Form.Item name="order" label="Display Order">
            <Input type="number" placeholder="1" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
