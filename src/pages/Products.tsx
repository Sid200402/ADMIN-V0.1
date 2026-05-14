import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Table, Button, Input, Select, Modal, Form, Alert, Tooltip,
  Popconfirm, message, InputNumber, Tag, Upload, Drawer,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  CheckCircleOutlined, FileExcelOutlined, FilePdfOutlined,
  PictureOutlined, SyncOutlined, StockOutlined, BarcodeOutlined,
} from "@ant-design/icons";
import { LabelPrinter } from "../utils/labelPrinter";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  productService, barcodeService, categoryService, brandService, masterBrandService,
  modelService, unitService, priceGroupService, storeService,
} from "../api/services";
import ShortcutHelp from "../components/ShortcutHelp";
import SearchableAddSelect from "../components/SearchableAddSelect";
import type { ColumnType } from "antd/es/table";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DISCONTINUED", label: "Discontinued" },
  { value: "UNAVAILABLE", label: "Unavailable" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#059669", INACTIVE: "#6b7280",
  DISCONTINUED: "#dc2626", UNAVAILABLE: "#d97706",
};

const DYNAMIC_FIELDS = [
  { key: "hasType", label: "Type", field: "type", number: false },
  { key: "hasSize", label: "Size", field: "size", number: false },
  { key: "hasColor", label: "Color", field: "color", number: false },
  { key: "hasCapacity", label: "Capacity", field: "capacity", number: false },
  { key: "hasWeight", label: "Weight", field: "weight", number: false },
  { key: "hasWarranty", label: "Warranty Days", field: "warrantyDays", number: true },
] as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const toUpper = (e: React.FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const s = el.selectionStart; const end = el.selectionEnd;
  el.value = el.value.toUpperCase();
  el.setSelectionRange(s, end);
};

export default function Products() {
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const limit = 10;
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [filterCatId, setFilterCatId] = useState("");
  const [filterBrandId, setFilterBrandId] = useState("");

  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageItem, setImageItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [statusItem, setStatusItem] = useState<any>(null);
  const [qtyItem, setQtyItem] = useState<any>(null);
  const [barcodeItem, setBarcodeItem] = useState<any>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [selectedLabelSize, setSelectedLabelSize] = useState("1");
  const [layoutColumns, setLayoutColumns] = useState(1);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState("57");
  const [customHeight, setCustomHeight] = useState("32");
  const [showActualSize, setShowActualSize] = useState(true);
  const [catConfig, setCatConfig] = useState<any>(null);

  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [qtyForm] = Form.useForm();

  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = useCallback((val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setKeyword(val); setPage(1); }, 500);
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ["products", page, keyword, status, filterCatId, filterBrandId],
    queryFn: () => productService.getAll({
      limit, offset: (page - 1) * limit,
      keyword, status, categoryId: filterCatId, brandId: filterBrandId,
    }).then(r => r.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: ["products-stats"],
    queryFn: () => productService.getStats().then(r => r.data),
    staleTime: 60_000,
  });

  const priceGroupsQuery = useQuery({
    queryKey: ["price-groups-active"],
    queryFn: () => priceGroupService.getActive().then(r => r.data?.result || []),
    staleTime: 60_000,
  });

  const storesQuery = useQuery({
    queryKey: ["stores-active"],
    queryFn: () => storeService.search(),
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["products-stats"] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (v: any) => productService.create(v),
    onSuccess: (res) => {
      const id = res.data?.id || res.data?.data?.id;
      message.success("Product created");
      setShowForm(false); form.resetFields(); setCatConfig(null); invalidate();
      if (id) setFocusedId(id);
    },
    onError: () => message.error("Failed to create product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => productService.update(id, v),
    onSuccess: (res, vars) => {
      message.success("Product updated");
      setShowForm(false); setEditItem(null); form.resetFields(); setCatConfig(null);
      if (vars.id) setFocusedId(vars.id);
      const updated: any = res.data;
      qc.setQueriesData({ queryKey: ["products"] }, (old: any) => {
        if (!old?.result) return old;
        return { ...old, result: old.result.map((p: any) => p.id === updated.id ? { ...p, ...updated } : p) };
      });
    },
    onError: () => message.error("Failed to update product"),
  });

  const patchCache = (updated: any) =>
    qc.setQueriesData({ queryKey: ["products"] }, (old: any) => {
      if (!old?.result) return old;
      return { ...old, result: old.result.map((p: any) => p.id === updated.id ? { ...p, ...updated } : p) };
    });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      productService.updateStatus(id, status),
    onSuccess: (res, vars) => {
      message.success("Status updated");
      setStatusItem(null); statusForm.resetFields();
      const updated = res.data;
      if (updated?.id) patchCache(updated);
      else patchCache({ id: vars.id, status: vars.status });
    },
    onError: () => message.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: (_, id) => {
      message.success("Product deleted");
      qc.setQueriesData({ queryKey: ["products"] }, (old: any) => {
        if (!old?.result) return old;
        return { ...old, result: old.result.filter((p: any) => p.id !== id), total: (old.total || 1) - 1 };
      });
      qc.invalidateQueries({ queryKey: ["products-stats"] });
    },
    onError: () => message.error("Failed to delete"),
  });

  const imageMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      productService.uploadImage(id, file),
    onSuccess: (res) => {
      message.success("Image uploaded"); setImageItem(null);
      const updated = res.data;
      if (updated?.id) patchCache(updated);
    },
    onError: () => message.error("Failed to upload image"),
  });

  const exportMutation = useMutation({
    mutationFn: () => productService.exportExcel(),
    onSuccess: (res) => downloadBlob(res.data, "products.xlsx"),
    onError: () => message.error("Export failed"),
  });

  const pdfMutation = useMutation({
    mutationFn: () => productService.downloadPdf(),
    onSuccess: (res) => downloadBlob(res.data, "products.pdf"),
    onError: () => message.error("PDF failed"),
  });

  const qtyMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      productService.updateQuantity(id, quantity),
    onSuccess: (res, vars) => {
      message.success("Quantity updated"); setQtyItem(null); qtyForm.resetFields();
      const updated = res.data;
      if (updated?.id) patchCache(updated);
      else patchCache({ id: vars.id, inventory: [{ stock: vars.quantity }] });
    },
    onError: () => message.error("Failed to update quantity"),
  });

  const generatePreview = async (productId: string) => {
    try {
      const res = await barcodeService.generate(productId);
      const url = await LabelPrinter.convertResponseToImageUrl(res);
      setPreviewImageUrl(url);
    } catch { message.error("Failed to generate preview"); }
  };

  const handlePrintBarcode = async () => {
    if (!barcodeItem) return;
    try {
      const res = await barcodeService.generate(barcodeItem.id);
      const url = await LabelPrinter.convertResponseToImageUrl(res);
      const dimensions = useCustomSize
        ? { width: `${customWidth}mm`, height: `${customHeight}mm`, name: "Custom" }
        : LabelPrinter.LABEL_SIZES[parseInt(selectedLabelSize)];
      await LabelPrinter.printToLabelPrinter(url, dimensions, layoutColumns, layoutColumns);
      message.success("Sent to printer");
      setBarcodeItem(null); setPreviewImageUrl("");
    } catch { message.error("Print failed"); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleCategorySelect = useCallback((id: string) => {
    if (!id) { setCatConfig(null); return; }
    categoryService.search("").then((items: any[]) => {
      setCatConfig(items.find((c: any) => c.id === id) || null);
    });
  }, []);

  const openCreate = () => {
    setEditItem(null); setCatConfig(null); form.resetFields();
    const stores: any[] = storesQuery.data || [];
    if (stores.length) form.setFieldValue("storeIds", [stores[0].id]);
    setShowForm(true);
  };

  const openEdit = (r: any) => {
    setEditItem(r);
    if (r.category?.id) handleCategorySelect(r.category.id);
    const priceMap: Record<string, number> = {};
    (r.productPrices || []).forEach((pp: any) => {
      priceMap[`pg_${pp.priceGroupId || pp.priceGroup?.id}`] = Number(pp.price);
    });
    form.setFieldsValue({
      name: r.name, description: r.description,
      categoryId: r.category?.id, brandId: r.brand?.id,
      masterBrandId: r.masterBrand?.id, modelId: r.model?.id,
      unitId: r.unit?.id, purchasePrice: Number(r.purchasePrice),
      lowStockAlert: r.lowStockAlert, manufacturer: r.manufacturer,
      type: r.type, size: r.size, color: r.color,
      capacity: r.capacity, weight: r.weight, warrantyDays: r.warrantyDays,
      ...priceMap,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false); setEditItem(null); setCatConfig(null); form.resetFields();
  };

  const onFinish = (v: any) => {
    const pGroups: any[] = priceGroupsQuery.data || [];
    const priceGroups = pGroups
      .filter(pg => v[`pg_${pg.id}`] != null)
      .map(pg => ({ priceGroupId: pg.id, price: v[`pg_${pg.id}`] }));

    const payload: any = {
      name: v.name, description: v.description,
      categoryId: v.categoryId, brandId: v.brandId,
      masterBrandId: v.masterBrandId, modelId: v.modelId,
      unitId: v.unitId, purchasePrice: v.purchasePrice,
      lowStockAlert: v.lowStockAlert, manufacturer: v.manufacturer,
      type: v.type, size: v.size, color: v.color,
      capacity: v.capacity, weight: v.weight, warrantyDays: v.warrantyDays,
      priceGroups,
    };

    if (!editItem) {
      payload.stores = (v.storeIds || []).map((sid: string) => ({
        storeId: sid,
        stock: v[`stock_${sid}`] || 0,
        minStock: v[`minStock_${sid}`] || 0,
        costPrice: v.purchasePrice,
      }));
    }

    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    if (editItem) updateMutation.mutate({ id: editItem.id, ...payload });
    else createMutation.mutate(payload);
  };

  const searchRef = useRef<any>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pendingFocusFirst, setPendingFocusFirst] = useState(false);

  const kbdStyle: React.CSSProperties = {
    background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3,
    padding: "0 5px", fontFamily: "monospace", fontSize: 10, color: "#475569",
    lineHeight: "18px", display: "inline-block",
  };
  const kbdRowStyle: React.CSSProperties = {
    background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3,
    padding: "0 4px", fontFamily: "monospace", fontSize: 10, color: "#475569",
    lineHeight: "16px", display: "inline-block",
  };

  const stats = statsQuery.data?.products;
  const items = listQuery.data?.result || [];
  const total = listQuery.data?.total || 0;
  const pGroups: any[] = priceGroupsQuery.data || [];
  const stores: any[] = storesQuery.data || [];

  const focusedIdx = focusedId ? items.findIndex((r: any) => r.id === focusedId) : -1;
  const anyModalOpen = showForm || !!imageItem || !!statusItem || !!qtyItem || !!barcodeItem || !!viewItem;

  useEffect(() => {
    if (pendingFocusFirst && !listQuery.isFetching && items.length > 0) {
      setFocusedId(items[0].id);
      setPendingFocusFirst(false);
    }
  }, [pendingFocusFirst, listQuery.isFetching, items]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (!e.altKey && (tag === "INPUT" || tag === "TEXTAREA")) return;
      if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        if (anyModalOpen) return;
        if (e.key === "ArrowDown") { e.preventDefault(); const n = focusedIdx < 0 ? 0 : Math.min(focusedIdx + 1, items.length - 1); setFocusedId(items[n]?.id ?? null); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); const p = focusedIdx < 0 ? 0 : Math.max(focusedIdx - 1, 0); setFocusedId(items[p]?.id ?? null); return; }
        if (e.key === "Escape") { setFocusedId(null); return; }
        if ((e.key === "Enter" || e.key === " ") && focusedIdx < 0 && items.length > 0) { e.preventDefault(); setFocusedId(items[0].id); return; }
        const row = focusedIdx >= 0 ? items[focusedIdx] : null;
        if (!row) return;
        if (e.key === "e" || e.key === "E") { e.preventDefault(); openEdit(row); }
        if (e.key === "u" || e.key === "U") { e.preventDefault(); setImageItem(row); }
        if (e.key === "s" || e.key === "S") { e.preventDefault(); setStatusItem(row); statusForm.setFieldValue("status", row.status); }
        if (e.key === "q" || e.key === "Q") { e.preventDefault(); setQtyItem(row); }
        if (e.key === "c" || e.key === "C") { e.preventDefault(); setBarcodeItem(row); setPreviewImageUrl(""); generatePreview(row.id); }
        if (e.key === "v" || e.key === "V") { e.preventDefault(); setViewItem({ type: "detail", data: row }); }
        return;
      }
      if (!e.altKey) return;
      if (e.key === "s" || e.key === "S") { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); openCreate(); }
      if (e.key === "e" || e.key === "E") { e.preventDefault(); exportMutation.mutate(); }
      if (e.key === "p" || e.key === "P") { e.preventDefault(); pdfMutation.mutate(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [anyModalOpen, focusedIdx, items, showForm]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnType<any>[] = [
    {
      title: "Product", key: "product", width: 280,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => r.imageUrl && setViewItem({ type: "image", data: r })}>
            {r.imageUrl
              ? <img src={r.imageUrl} alt={r.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #f1f5f9", transition: "opacity 0.2s" }} />
              : <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#cbd5e1" }}>📦</div>
            }
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{r.sku}</div>
            <div
              style={{ fontSize: 11, color: "#2563eb", marginTop: 4, cursor: "pointer", textDecoration: "underline" }}
              onClick={() => setViewItem({ type: "detail", data: r })}
            >View details</div>
          </div>
        </div>
      ),
    },
    {
      title: "Category", key: "category", width: 120,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.category?.name || "—"}</span>,
    },
    {
      title: "Master Brand", key: "masterBrand", width: 120,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.masterBrand?.name || "—"}</span>,
    },
    {
      title: "Brand", key: "brand", width: 110,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.brand?.name || "—"}</span>,
    },
    {
      title: "Model", key: "model", width: 110,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.model?.name || "—"}</span>,
    },
    {
      title: "Unit", key: "unit", width: 60,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.unit?.name || "—"}</span>,
    },
    {
      title: <span style={{ fontSize: 11 }}>Purchase<br />Price</span>, dataIndex: "purchasePrice", key: "purchasePrice",
      align: "right" as const, width: 80,
      render: (v: any) => v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—",
    },
    {
      title: "Prices", key: "prices", width: 160,
      render: (_: any, r: any) => (
        <div style={{ fontSize: 12 }}>
          {(r.productPrices || []).map((pp: any) => (
            <div key={pp.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, whiteSpace: "nowrap" }}>
              <span style={{ color: "#6b7280" }}>{pp.priceGroup?.name}</span>
              <span style={{ fontWeight: 600 }}>₹{Number(pp.price).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Stock / Warranty", key: "stock", align: "center" as const, width: 120,
      render: (_: any, r: any) => {
        const inv = r.inventory?.[0];
        const total = (r.inventory || []).reduce((s: number, i: any) => s + (i.stock || 0), 0);
        const ws = inv?.warrantyStatus;
        const wsColor = ws === "UNDER_WARRANTY" ? "#059669" : ws === "EXPIRED" ? "#dc2626" : "#d97706";
        return (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{total}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>min: {inv?.minStock ?? 0}</div>
            {ws && <div style={{ fontSize: 10, color: wsColor, marginTop: 2 }}>{ws.replace("_", " ")}</div>}
          </div>
        );
      },
    },
    {
      title: "Status", key: "status", align: "center" as const, width: 110,
      render: (_: any, r: any) => (
        <Tag
          style={{ cursor: "pointer", background: STATUS_COLORS[r.status] || "#6b7280", color: "#fff", border: "none" }}
          onClick={() => { setStatusItem(r); statusForm.setFieldValue("status", r.status); }}
        >
          {r.status}
        </Tag>
      ),
    },
    {
      title: "Actions", key: "actions", align: "center" as const, width: 130,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
          <Tooltip title="View Details"><Button size="small" icon={<SearchOutlined />} onClick={() => setViewItem({ type: "detail", data: r })}><kbd style={kbdRowStyle}>V</kbd></Button></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}><kbd style={kbdRowStyle}>E</kbd></Button></Tooltip>
          <Tooltip title="Upload Image"><Button size="small" icon={<PictureOutlined />} style={{ color: "#7c3aed", borderColor: "#7c3aed" }} onClick={() => setImageItem(r)}><kbd style={kbdRowStyle}>U</kbd></Button></Tooltip>
          <Tooltip title="Update Status"><Button size="small" icon={<SyncOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }} onClick={() => { setStatusItem(r); statusForm.setFieldValue("status", r.status); }}><kbd style={kbdRowStyle}>S</kbd></Button></Tooltip>
          <Tooltip title="Update Quantity"><Button size="small" icon={<StockOutlined />} style={{ color: "#059669", borderColor: "#059669" }} onClick={() => setQtyItem(r)}><kbd style={kbdRowStyle}>Q</kbd></Button></Tooltip>
          <Tooltip title="Print Barcode"><Button size="small" icon={<BarcodeOutlined />} onClick={() => { setBarcodeItem(r); setPreviewImageUrl(""); generatePreview(r.id); }}><kbd style={kbdRowStyle}>C</kbd></Button></Tooltip>
          <Popconfirm title="Delete this product?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Yes" cancelText="No">
            <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
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
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Products</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage all products</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Tooltip title="Export Excel">
            <Button icon={<FileExcelOutlined />} loading={exportMutation.isPending} onClick={() => exportMutation.mutate()} style={{ color: "#059669", borderColor: "#059669" }}>
              <kbd style={kbdStyle}>Alt+E</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button icon={<FilePdfOutlined />} loading={pdfMutation.isPending} onClick={() => pdfMutation.mutate()} style={{ color: "#dc2626", borderColor: "#dc2626" }}>
              <kbd style={kbdStyle}>Alt+P</kbd>
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: "#2563eb" }}>
            New Product <kbd style={{ ...kbdStyle, background: "rgba(255,255,255,0.2)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Alt+N</kbd>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {([
            ["Total", stats.total, "#2563eb"],
            ["Active", stats.active, "#059669"],
            ["Inactive", stats.inactive, "#6b7280"],
            ["Discontinued", stats.discontinued, "#dc2626"],
            ["Unavailable", stats.unavailable, "#d97706"],
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
        <Input
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          suffix={<kbd style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3, padding: "0 5px", fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>Alt+S</kbd>}
          placeholder="Search name/SKU…"
          ref={searchRef}
          value={searchInput}
          onChange={e => handleSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); clearTimeout(debounceRef.current); setKeyword(searchInput); setPage(1); searchRef.current?.blur(); setPendingFocusFirst(true); }
            if (e.key === "Escape") { setSearchInput(""); setKeyword(""); setPage(1); searchRef.current?.blur(); }
          }}
          style={{ width: 240 }}
        />
        <Select value={status} onChange={v => { setStatus(v); setPage(1); }} style={{ width: 150 }} options={STATUS_OPTIONS} />
        <SearchableAddSelect
          placeholder="Filter by Category" allowClear
          value={filterCatId || undefined}
          onChange={v => { setFilterCatId(v || ""); setPage(1); }}
          fetchFn={categoryService.search}
          style={{ width: 180 }}
        />
        <SearchableAddSelect
          placeholder="Filter by Brand" allowClear
          value={filterBrandId || undefined}
          onChange={v => { setFilterBrandId(v || ""); setPage(1); }}
          fetchFn={brandService.search}
          style={{ width: 180 }}
        />
        {(keyword || status || filterCatId || filterBrandId) && (
          <Button onClick={() => { setSearchInput(""); setKeyword(""); setStatus(""); setFilterCatId(""); setFilterBrandId(""); setPage(1); }}>Clear</Button>
        )}
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load products." style={{ marginBottom: 12 }} />}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns} dataSource={items} rowKey="id"
          loading={{ spinning: listQuery.isFetching, size: "large" }}
          size="middle" scroll={{ x: "max-content" }}
          rowClassName={(r: any) => r.id === focusedId ? "prod-row-focused" : ""}
          onRow={(r: any) => ({ onClick: () => setFocusedId(r.id) })}
          pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: t => `Total ${t} products` }}
        />
      </div>
      <style>{`
        .prod-row-focused td { background: #f0fdf4 !important; box-shadow: inset 0 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
        .prod-row-focused td:first-child { box-shadow: inset 2px 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
        .prod-row-focused td:last-child  { box-shadow: inset -2px 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
      `}</style>

      {/* Create / Edit Drawer */}
      <Drawer
        open={showForm}
        title={editItem ? <><EditOutlined /> Edit Product</> : <><PlusOutlined /> New Product</>}
        onClose={closeForm} size="large" destroyOnHidden footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}
          onValuesChange={changed => {
            if (changed.categoryId !== undefined) handleCategorySelect(changed.categoryId);
          }}
        >
          {/* Category — full width */}
          <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: "Required" }]}>
            <SearchableAddSelect
              placeholder="Category" fetchFn={categoryService.search} tabIndex={1}
              createConfig={{
                label: "Category", createFn: categoryService.create,
                buildPayload: v => ({ name: v.name, hasType: "NO", hasSize: "NO", hasColor: "NO", hasCapacity: "NO", hasWeight: "NO", hasWarranty: "NO" }),
                onAfterCreate: item => handleCategorySelect(item.id),
              }}
            />
          </Form.Item>

          {/* Master Brand | Brand */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Form.Item name="masterBrandId" label="Master Brand">
              <SearchableAddSelect
                placeholder="Master Brand" allowClear fetchFn={masterBrandService.search} tabIndex={2}
                createConfig={{ label: "Master Brand", createFn: masterBrandService.create }}
              />
            </Form.Item>
            <Form.Item name="brandId" label="Brand" rules={[{ required: true, message: "Required" }]}>
              <SearchableAddSelect
                placeholder="Brand" fetchFn={brandService.search} tabIndex={3}
                createConfig={{ label: "Brand", createFn: brandService.create }}
              />
            </Form.Item>
          </div>

          {/* Model | Unit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Form.Item name="modelId" label="Model">
              <SearchableAddSelect
                placeholder="Model (optional)" allowClear fetchFn={modelService.search} tabIndex={4}
                createConfig={{ label: "Model", createFn: modelService.create }}
              />
            </Form.Item>
            <Form.Item name="unitId" label="Unit" rules={[{ required: true, message: "Required" }]}>
              <SearchableAddSelect
                placeholder="Unit" fetchFn={unitService.search} tabIndex={5}
                createConfig={{
                  label: "Unit", createFn: unitService.create,
                  extraFields: (
                    <Form.Item name="shortName" label="Short Name" rules={[{ required: true, message: "Required" }]}>
                      <Input placeholder="e.g. PCS" onInput={toUpper} style={{ textTransform: "uppercase" }} />
                    </Form.Item>
                  ),
                  buildPayload: v => ({ name: v.name?.toUpperCase(), shortName: v.shortName?.toUpperCase() }),
                }}
              />
            </Form.Item>
          </div>

          {/* Product Name */}
          <Form.Item name="name" label="Product Name">
            <Input tabIndex={5} placeholder="Auto-generated if empty" onInput={toUpper} style={{ textTransform: "uppercase" }} />
          </Form.Item>

          {/* Low Stock + Manufacturer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Form.Item name="lowStockAlert" label="Low Stock Alert">
              <InputNumber tabIndex={6} min={0} style={{ width: "100%" }} placeholder="e.g. 5" />
            </Form.Item>
            <Form.Item name="manufacturer" label="Manufacturer">
              <Input tabIndex={7} placeholder="e.g. Apple" onInput={toUpper} style={{ textTransform: "uppercase" }} />
            </Form.Item>
          </div>

          {/* Dynamic fields */}
          {catConfig && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              {DYNAMIC_FIELDS.map(({ key, label, field, number: isNum }, idx) =>
                catConfig[key] === "YES" ? (
                  <Form.Item key={field} name={field} label={label} rules={[{ required: true, message: "Required" }]}>
                    {isNum
                      ? <InputNumber tabIndex={8 + idx} min={1} style={{ width: "100%" }} placeholder={label} />
                      : <Input tabIndex={8 + idx} placeholder={label} onInput={toUpper} style={{ textTransform: "uppercase" }} />
                    }
                  </Form.Item>
                ) : null
              )}
            </div>
          )}

          {/* Description */}
          <Form.Item name="description" label="Description">
            <Input.TextArea tabIndex={15} rows={2} placeholder="Optional" />
          </Form.Item>


          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>Pricing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <Form.Item name="purchasePrice" label="Purchase Price" rules={[{ required: true, message: "Required" }]}>
                <InputNumber tabIndex={17} min={0.01} style={{ width: "100%" }} placeholder="e.g. 80000" prefix="₹" />
              </Form.Item>
              {pGroups.map((pg: any, idx: number) => (
                <Form.Item key={pg.id} name={`pg_${pg.id}`} label={pg.name}>
                  <InputNumber tabIndex={18 + idx} min={0} style={{ width: "100%" }} placeholder="Price" prefix="₹" />
                </Form.Item>
              ))}
            </div>
          </div>

          {/* Store assignment — create only */}
          {!editItem && stores.length > 0 && (
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>Store Assignment</div>
              <Form.Item name="storeIds" label="Stores" rules={[{ required: true, message: "Select at least 1 store" }]}>
                <Select mode="multiple" placeholder="Select stores" tabIndex={30}
                  options={stores.map((s: any) => ({ value: s.id, label: s.name }))} />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(p, c) => p.storeIds !== c.storeIds}>
                {({ getFieldValue }) => {
                  const selected: string[] = getFieldValue("storeIds") || [];
                  return selected.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                      {selected.map((sid: string, idx: number) => {
                        const s = stores.find((x: any) => x.id === sid);
                        return (
                          <div key={sid} style={{ background: "#fff", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{s?.name}</div>
                            <Form.Item name={`stock_${sid}`} label="Initial Qty" style={{ marginBottom: 6 }}>
                              <InputNumber tabIndex={31 + idx * 2} min={0} style={{ width: "100%" }} placeholder="0" />
                            </Form.Item>
                            <Form.Item name={`minStock_${sid}`} label="Min Stock" style={{ marginBottom: 0 }}>
                              <InputNumber tabIndex={32 + idx * 2} min={0} style={{ width: "100%" }} placeholder="0" />
                            </Form.Item>
                          </div>
                        );
                      })}
                    </div>
                  ) : null;
                }}
              </Form.Item>
            </div>
          )}

          {/* SKU read-only on edit */}
          {editItem && (
            <Form.Item label="SKU">
              <Input value={editItem.sku} disabled />
            </Form.Item>
          )}

          <Button
            type="primary" htmlType="submit" block tabIndex={50}
            loading={createMutation.isPending || updateMutation.isPending}
            style={{ background: "#2563eb" }}
            icon={editItem ? <CheckCircleOutlined /> : <PlusOutlined />}
          >
            {editItem ? "Update Product" : "Create Product"}
          </Button>
        </Form>
      </Drawer>

      {/* Image Upload Modal */}
      <Modal open={!!imageItem} title="Upload Product Image" onCancel={() => setImageItem(null)} footer={null}>
        <Upload accept="image/*" showUploadList={false}
          beforeUpload={file => { imageMutation.mutate({ id: imageItem.id, file }); return false; }}>
          <Button icon={<PictureOutlined />} loading={imageMutation.isPending}>Click to select image</Button>
        </Upload>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        open={!!statusItem} title="Update Product Status"
        onCancel={() => { setStatusItem(null); statusForm.resetFields(); }}
        onOk={() => statusForm.submit()} okText="Update" confirmLoading={statusMutation.isPending}
      >
        <Form form={statusForm} layout="vertical"
          onFinish={v => statusMutation.mutate({ id: statusItem.id, status: v.status })}>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS.filter(o => o.value)} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quantity Update Modal */}
      <Modal
        open={!!qtyItem}
        title={<><StockOutlined /> Update Quantity — {qtyItem?.name}</>}
        onCancel={() => { setQtyItem(null); qtyForm.resetFields(); }}
        onOk={() => qtyForm.submit()} okText="Update" confirmLoading={qtyMutation.isPending}
      >
        <Form form={qtyForm} layout="vertical"
          onFinish={v => qtyMutation.mutate({ id: qtyItem.id, quantity: v.quantity })}>
          <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280" }}>
            Current stock: <strong>{(qtyItem?.inventory || []).reduce((s: number, i: any) => s + (i.stock || 0), 0)}</strong>
          </div>
          <Form.Item name="quantity" label="New Quantity" rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={0} style={{ width: "100%" }} autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      {/* Barcode Modal */}
      <Modal
        open={!!barcodeItem}
        title={<><BarcodeOutlined /> Print Barcode — {barcodeItem?.name}</>}
        onCancel={() => { setBarcodeItem(null); setPreviewImageUrl(""); setShowActualSize(false); setUseCustomSize(false); }}
        onOk={handlePrintBarcode} okText="Print"
        width={480}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Label Size</div>
            <Select
              style={{ width: "100%" }}
              value={useCustomSize ? "custom" : selectedLabelSize}
              onChange={v => { if (v === "custom") setUseCustomSize(true); else { setUseCustomSize(false); setSelectedLabelSize(v); } }}
              options={[
                ...LabelPrinter.LABEL_SIZES.map((s, i) => ({ value: String(i), label: s.name })),
                { value: "custom", label: "Custom Size" },
              ]}
            />
          </div>
          {useCustomSize && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Width (mm)</div>
                <InputNumber value={Number(customWidth)} onChange={v => setCustomWidth(String(v))} min={25} max={200} style={{ width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Height (mm)</div>
                <InputNumber value={Number(customHeight)} onChange={v => setCustomHeight(String(v))} min={13} max={100} style={{ width: "100%" }} />
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Layout</div>
            <Select
              style={{ width: "100%" }}
              value={layoutColumns}
              onChange={setLayoutColumns}
              options={[
                { value: 1, label: "Single Column (1 Label)" },
                { value: 2, label: "Double Column (2 Labels)" },
              ]}
            />
          </div>
          {previewImageUrl && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Preview</div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={showActualSize} onChange={e => setShowActualSize(e.target.checked)} />
                  Actual Size
                </label>
              </div>
              <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 8, padding: 24, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160, overflow: "auto" }}>
                <div style={{
                  width: useCustomSize ? `${customWidth}mm` : LabelPrinter.LABEL_SIZES[parseInt(selectedLabelSize)]?.width || "57mm",
                  height: useCustomSize ? `${customHeight}mm` : LabelPrinter.LABEL_SIZES[parseInt(selectedLabelSize)]?.height || "32mm",
                  border: "2px dashed #2563eb", display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#fff", transform: showActualSize ? "scale(1)" : "scale(4)", transformOrigin: "center",
                }}>
                  <img src={previewImageUrl} alt="Barcode" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
                </div>
              </div>
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, fontSize: 12, color: "#1e40af", textAlign: "center" }}>
                {useCustomSize ? `${customWidth}mm × ${customHeight}mm` : LabelPrinter.LABEL_SIZES[parseInt(selectedLabelSize)]?.name}
                {" — "}{showActualSize ? "Actual size" : "Enlarged 2.5× for visibility"}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal open={viewItem?.type === "image"} footer={null} onCancel={() => setViewItem(null)} centered width={480}>
        <img src={viewItem?.data?.imageUrl} alt={viewItem?.data?.name} style={{ width: "100%", borderRadius: 8, objectFit: "contain" }} />
      </Modal>

      {/* Product Detail Modal */}
      <Modal
        open={viewItem?.type === "detail"} footer={null} onCancel={() => setViewItem(null)}
        title={viewItem?.data?.name} centered width={520}
      >
        {viewItem?.data && (() => {
          const r = viewItem.data; return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {r.imageUrl && <img src={r.imageUrl} alt={r.name} style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, background: "#f8fafc" }} />}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
                {[["SKU", r.sku], ["Status", r.status], ["Category", r.category?.name], ["Brand", r.brand?.name],
                ["Master Brand", r.masterBrand?.name], ["Model", r.model?.name], ["Unit", r.unit?.name],
                ["Purchase Price", r.purchasePrice ? `₹${Number(r.purchasePrice).toLocaleString("en-IN")}` : null],
                ["Low Stock Alert", r.lowStockAlert], ["Manufacturer", r.manufacturer],
                ["Type", r.type], ["Size", r.size], ["Color", r.color], ["Capacity", r.capacity], ["Weight", r.weight],
                ].filter(([, v]) => v != null && v !== "").map(([label, val]) => (
                  <div key={label as string}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{val}</div>
                  </div>
                ))}
              </div>
              {(r.productPrices || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Prices</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {r.productPrices.map((pp: any) => (
                      <div key={pp.id} style={{ background: "#f1f5f9", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                        <span style={{ color: "#6b7280" }}>{pp.priceGroup?.name}: </span>
                        <span style={{ fontWeight: 700 }}>₹{Number(pp.price).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(r.inventory || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Stock</div>
                  {r.inventory.map((inv: any) => (
                    <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ color: "#6b7280" }}>Stock: <strong>{inv.stock}</strong> &nbsp; Min: <strong>{inv.minStock}</strong></span>
                      {inv.warrantyStatus && <span style={{ color: inv.warrantyStatus === "UNDER_WARRANTY" ? "#059669" : "#dc2626", fontWeight: 600 }}>{inv.warrantyStatus.replace("_", " ")}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓", label: "Move selection" },
        { key: "Esc", label: "Clear selection" },
        { key: "Enter", label: "Focus first row" },
        { key: "E", label: "Edit product" },
        { key: "U", label: "Upload image" },
        { key: "S", label: "Update status" },
        { key: "Q", label: "Update quantity" },
        { key: "C", label: "Print barcode" },
        { key: "V", label: "View details" },
        { key: "Alt+S", label: "Focus search" },
        { key: "Alt+N", label: "New product" },
        { key: "Alt+E", label: "Export Excel" },
        { key: "Alt+P", label: "Download PDF" },
      ]} />
    </div>
  );
}
