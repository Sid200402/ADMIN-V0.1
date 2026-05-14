import React, { useState, useCallback, useEffect, useRef } from "react";
import { Table, Button, Input, Select, Tag, Tooltip, Alert, message, Modal, DatePicker, Upload } from "antd";
import {
  SearchOutlined, PlusOutlined, ShoppingCartOutlined,
  EditOutlined, SwapOutlined, ApartmentOutlined,
  BarcodeOutlined, FileExcelOutlined, FilePdfOutlined,
  DownloadOutlined, PictureOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  inventoryService, storeService, priceGroupService, categoryService, productService,
  brandService, masterBrandService,
} from "../api/services";
import type { ColumnType } from "antd/es/table";
import PurchaseModal  from "../components/inventory/PurchaseModal";
import AdjustModal    from "../components/inventory/AdjustModal";
import TransferModal  from "../components/inventory/TransferModal";
import BatchModal     from "../components/inventory/BatchModal";
import BarcodeModal   from "../components/inventory/BarcodeModal";
import ProductFormDrawer from "../components/ProductFormDrawer";
import ShortcutHelp from "../components/ShortcutHelp";

// ── helpers ────────────────────────────────────────────────────────────────
const fmtRs = (v: any) => v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";

const STOCK_COLOR: Record<string, string> = {
  IN_STOCK: "#059669", LOW_STOCK: "#d97706", OUT_OF_STOCK: "#dc2626",
};
const WARRANTY_COLOR: Record<string, string> = {
  UNDER_WARRANTY: "#2563eb", EXPIRING_SOON: "#d97706", EXPIRED: "#dc2626",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Inventory page ─────────────────────────────────────────────────────────
export default function Inventory() {
  const qc = useQueryClient();

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

  // ── filters ──────────────────────────────────────────────────────────────
  const [page, setPage]               = useState(1);
  const limit                         = 10;
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword]         = useState("");
  const [storeId, setStoreId]         = useState("");
  const [stockStatus, setStockStatus] = useState("IN_STOCK");
  const [categoryId, setCategoryId]   = useState("");
  const [brandId, setBrandId]         = useState("");
  const [masterBrandId, setMasterBrandId] = useState("");
  const [priceGroupId, setPriceGroupId]   = useState("");
  const searchRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── modal state ───────────────────────────────────────────────────────────
  const [purchaseItem,  setPurchaseItem]  = useState<any>(null);
  const [adjustItem,    setAdjustItem]    = useState<any>(null);
  const [transferItem,  setTransferItem]  = useState<any>(null);
  const [batchItem,     setBatchItem]     = useState<any>(null);
  const [barcodeItem,   setBarcodeItem]   = useState<any>(null);
  const [productForm,   setProductForm]   = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [exporting,     setExporting]     = useState(false);
  const [historyModal,  setHistoryModal]  = useState(false);
  const [historyDates,  setHistoryDates]  = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [dlModal,       setDlModal]       = useState<"inventory" | "catbrand" | null>(null);
  const [dlPriceGroup,  setDlPriceGroup]  = useState("");
  const [dlStore,       setDlStore]       = useState("");
  const [dlCategory,    setDlCategory]    = useState("");
  const [focusedId,     setFocusedId]     = useState<string | null>(null);
  const [uploadItem,    setUploadItem]    = useState<any>(null);
  const [uploadFile,    setUploadFile]    = useState<File | null>(null);
  const [uploading,     setUploading]     = useState(false);

  // ── queries ───────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ["inventory", page, keyword, storeId, stockStatus, categoryId, brandId, masterBrandId, priceGroupId],
    queryFn: () => inventoryService.getAll({
      limit, offset: (page - 1) * limit,
      keyword, storeId, stockStatus, categoryId, brandId, masterBrandId, priceGroupId,
    }).then(r => r.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const dashQuery = useQuery({
    queryKey: ["inventory-dashboard"],
    queryFn: () => inventoryService.getDashboard().then(r => r.data),
    staleTime: 60_000,
  });

  const storesQuery = useQuery({
    queryKey: ["stores-active"],
    queryFn: () => storeService.search().then((r: any) => r.data?.result || r.data || []),
    staleTime: 300_000,
  });

  const pGroupsQuery = useQuery({
    queryKey: ["price-groups-active"],
    queryFn: () => priceGroupService.getActive().then((r: any) => r.data?.result || []),
    staleTime: 300_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-active"],
    queryFn: () => categoryService.search(),
    staleTime: 300_000,
  });

  const brandsQuery = useQuery({
    queryKey: ["brands-active"],
    queryFn: () => brandService.search(),
    staleTime: 300_000,
  });

  const masterBrandsQuery = useQuery({
    queryKey: ["master-brands-active"],
    queryFn: () => masterBrandService.search(),
    staleTime: 300_000,
  });

  // auto-select default store
  useEffect(() => {
    const stores: any[] = storesQuery.data || [];
    if (stores.length && !storeId) {
      const def = stores.find((s: any) => s.defaultStore);
      if (def) setStoreId(def.id);
    }
  }, [storesQuery.data]);

  // silent refetch — keeps current page, focused row preserved by ID
  const refetchAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["inventory-dashboard"] });
  }, [qc]);

  const handleUploadConfirm = async () => {
    if (!uploadFile || !uploadItem?.product?.id) return;
    setUploading(true);
    try {
      await productService.uploadImage(uploadItem.product.id, uploadFile);
      message.success("Image uploaded");
      setUploadItem(null); setUploadFile(null);
      refetchAll();
    } catch { message.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await inventoryService.exportExcel({ priceGroupId: priceGroupId || undefined });
      downloadBlob(res.data, "inventory.xlsx");
    } catch { message.error("Export failed"); }
    finally { setExporting(false); }
  };

  const exportPdf = async (type: "purchase" | "transfer") => {
    try {
      const res = type === "purchase"
        ? await inventoryService.exportPurchaseHistoryPdf({})
        : await inventoryService.exportTransferHistoryPdf({});
      downloadBlob(res.data, type === "purchase" ? "purchase-history.pdf" : "transfer-history.pdf");
    } catch { message.error("Export failed"); }
  };

  const openDlModal = (type: "inventory" | "catbrand") => {
    setDlPriceGroup(priceGroupId || "");
    setDlStore(storeId || "");
    setDlCategory(categoryId || "");
    setDlModal(type);
  };

  const handleDlConfirm = async () => {
    if (!dlPriceGroup) { message.warning("Price Group is required"); return; }
    try {
      const params = { priceGroupId: dlPriceGroup, storeId: dlStore || undefined, categoryId: dlCategory || undefined };
      if (dlModal === "inventory") {
        const res = await inventoryService.exportInventoryPdf(params);
        downloadBlob(res.data, "inventory.pdf");
      } else {
        const res = await inventoryService.exportCategoryBrandPdf({ priceGroupId: dlPriceGroup, storeId: dlStore || undefined });
        downloadBlob(res.data, "category-brand.pdf");
      }
      setDlModal(null);
    } catch { message.error("Export failed"); }
  };

  const exportCreationHistory = async () => {
    const [s, e] = historyDates;
    if (!s || !e) { message.warning("Select date range"); return; }
    try {
      const res = await inventoryService.exportCreationHistoryPdf(s.format("YYYY-MM-DD"), e.format("YYYY-MM-DD"));
      downloadBlob(res.data, "creation-history.pdf");
      setHistoryModal(false);
    } catch { message.error("Export failed"); }
  };

  // ── data ──────────────────────────────────────────────────────────────────
  const items: any[]   = listQuery.data?.result || [];
  const total: number  = listQuery.data?.total  || 0;
  const dash           = dashQuery.data;
  const stores: any[]  = storesQuery.data  || [];
  const pGroups: any[]      = pGroupsQuery.data      || [];
  const categories: any[]   = categoriesQuery.data    || [];
  const brands: any[]       = brandsQuery.data        || [];
  const masterBrands: any[] = masterBrandsQuery.data  || [];

  // map focusedId → current index (survives refetch)
  const focusedIdx = focusedId ? items.findIndex(r => r.id === focusedId) : -1;

  // after search Enter — auto-focus first row once data arrives
  const [pendingFocusFirst, setPendingFocusFirst] = useState(false);
  const [pendingFocusLast,  setPendingFocusLast]  = useState(false);

  useEffect(() => {
    if (pendingFocusFirst && !listQuery.isFetching && items.length > 0) {
      setFocusedId(items[0].id);
      setPendingFocusFirst(false);
    }
  }, [pendingFocusFirst, listQuery.isFetching, items]);

  useEffect(() => {
    if (pendingFocusLast && !listQuery.isFetching && items.length > 0) {
      setFocusedId(items[items.length - 1].id);
      setPendingFocusLast(false);
    }
  }, [pendingFocusLast, listQuery.isFetching, items]);

  const anyModalOpen = !!purchaseItem || !!adjustItem || !!transferItem || !!batchItem || !!barcodeItem || !!uploadItem || productForm.open || historyModal || !!dlModal;

  // scroll focused row into view + page up/down support
  useEffect(() => {
    if (!focusedId) return;
    // Use rAF to wait for React to apply the class to the DOM
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(".inv-row-focused") as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const headerH = 64; // sticky header height
      const pad = 16;
      if (rect.top < headerH + pad) {
        window.scrollBy({ top: rect.top - headerH - pad, behavior: "smooth" });
      } else if (rect.bottom > window.innerHeight - pad) {
        window.scrollBy({ top: rect.bottom - window.innerHeight + pad, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [focusedId]);

  // Page Up / Page Down — jump by limit rows
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (anyModalOpen) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "PageDown") {
        e.preventDefault();
        if (page * limit < total) { setPage(p => p + 1); setFocusedId(null); }
      }
      if (e.key === "PageUp") {
        e.preventDefault();
        if (page > 1) { setPage(p => p - 1); setFocusedId(null); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [anyModalOpen, page, limit, total]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (anyModalOpen) return;
      // ignore when typing in input/select
      const tag = (e.target as HTMLElement).tagName;
      if (!e.altKey && (tag === "INPUT" || tag === "TEXTAREA")) return;
      const row = focusedIdx >= 0 ? items[focusedIdx] : null;

      if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (focusedIdx < 0) {
            setFocusedId(items[0]?.id ?? null);
          } else if (focusedIdx < items.length - 1) {
            setFocusedId(items[focusedIdx + 1].id);
          } else if (page * limit < total) {
            // last row on page → go to next page, focus first row
            setPage(p => p + 1);
            setPendingFocusFirst(true);
            setFocusedId(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (focusedIdx <= 0 && page > 1) {
            // first row on page → go to prev page, focus last row
            setPage(p => p - 1);
            setPendingFocusLast(true);
            setFocusedId(null);
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          } else if (focusedIdx > 0) {
            setFocusedId(items[focusedIdx - 1].id);
          }
          return;
        }
        if (e.key === "Escape") { setFocusedId(null); return; }
        // press Enter or Space with no selection → focus first row
        if ((e.key === "Enter" || e.key === " ") && focusedIdx < 0 && items.length > 0) {
          e.preventDefault(); setFocusedId(items[0].id); return;
        }
        if (!row) return;
        if (e.key === "e" || e.key === "E") { e.preventDefault(); setProductForm({ open: true, item: row.product }); }
        if (e.key === "p" || e.key === "P") { e.preventDefault(); setPurchaseItem(row); }
        if (e.key === "a" || e.key === "A") { e.preventDefault(); setAdjustItem(row); }
        if (e.key === "t" || e.key === "T") { e.preventDefault(); setTransferItem(row); }
        if (e.key === "b" || e.key === "B") { e.preventDefault(); setBatchItem(row); }
        if (e.key === "u" || e.key === "U") { e.preventDefault(); setUploadItem(row); }
        if (e.key === "c" || e.key === "C") { e.preventDefault(); setBarcodeItem(row); }
        return;
      }
      if (!e.altKey) return;
      if (e.key === "s" || e.key === "S") { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setProductForm({ open: true, item: null }); }
      if (e.key === "k" || e.key === "K") { e.preventDefault(); setPurchaseItem({}); }
      if (e.key === "e" || e.key === "E") { e.preventDefault(); handleExport(); }
      if (e.key === "p" || e.key === "P") { e.preventDefault(); openDlModal("catbrand"); }
      if (e.key === "i" || e.key === "I") { e.preventDefault(); openDlModal("inventory"); }
      if (e.key === "u" || e.key === "U") { e.preventDefault(); exportPdf("purchase"); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); exportPdf("transfer"); }
      if (e.key === "h" || e.key === "H") { e.preventDefault(); setHistoryModal(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [anyModalOpen, focusedIdx, items]);

  // ── columns ───────────────────────────────────────────────────────────────
  const columns: ColumnType<any>[] = [
    {
      title: "Product", key: "product", width: 220,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {r.product?.imageUrl
              ? <img src={r.product.imageUrl} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #f1f5f9" }} />
              : <div style={{ width: 72, height: 72, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>📦</div>
            }
            <div
              onClick={ev => { ev.stopPropagation(); setUploadItem(r); }}
              style={{ position: "absolute", inset: 0, borderRadius: 6, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
            >
              <PictureOutlined style={{ color: "#fff", fontSize: 16 }} />
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{r.product?.name}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.product?.sku}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Store", key: "store", width: 100,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.store?.name || "—"}</span>,
    },
    {
      title: "Stock", key: "stock", align: "center" as const, width: 75,
      render: (_: any, r: any) => (
        <Tag style={{ background: STOCK_COLOR[r.stockStatus] || "#6b7280", color: "#fff", border: "none", fontWeight: 700, fontSize: 13 }}>
          {r.stock ?? 0}
        </Tag>
      ),
    },
    {
      title: "Min", dataIndex: "minStock", key: "minStock", align: "center" as const, width: 55,
      render: (v: any) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v ?? 0}</span>,
    },
    {
      title: <span style={{ fontSize: 11 }}>Purchase<br/>Price</span>, dataIndex: "costPrice", key: "costPrice", align: "right" as const, width: 80,
      render: fmtRs,
    },
    {
      title: "Prices", key: "prices", width: 150,
      render: (_: any, r: any) => (
        <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>
          {(r.product?.productPrices || []).map((pp: any) => (
            <div key={pp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <span style={{
                background: "#f1f5f9", borderRadius: 4, padding: "1px 6px",
                fontSize: 10, color: "#475569", fontWeight: 600, whiteSpace: "nowrap",
              }}>{pp.priceGroup?.name}</span>
              <span style={{ fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                ₹{Number(pp.price).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Stock Status", key: "stockStatus", align: "center" as const, width: 110,
      render: (_: any, r: any) => (
        <Tag style={{ background: STOCK_COLOR[r.stockStatus] || "#6b7280", color: "#fff", border: "none", fontSize: 11 }}>
          {r.stockStatus?.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Warranty", key: "warranty", align: "center" as const, width: 110,
      render: (_: any, r: any) => r.warrantyStatus ? (
        <Tag style={{ background: WARRANTY_COLOR[r.warrantyStatus] || "#6b7280", color: "#fff", border: "none", fontSize: 11 }}>
          {r.warrantyStatus?.replace(/_/g, " ")}
        </Tag>
      ) : <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>,
    },
    {
      title: "Category", key: "category", width: 110,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.product?.category?.name || "—"}</span>,
    },
    {
      title: "Brand", key: "brand", width: 100,
      render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.product?.brand?.name || "—"}</span>,
    },
    {
      title: "Actions", key: "actions", align: "center" as const, width: 260,
      render: (_: any, r: any) => (
        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
          <Tooltip title="Edit Product">
            <Button size="small" icon={<EditOutlined />} onClick={() => setProductForm({ open: true, item: r.product })}>
              <kbd style={kbdRowStyle}>E</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Purchase Stock">
            <Button size="small" icon={<ShoppingCartOutlined />} style={{ color: "#059669", borderColor: "#059669" }} onClick={() => setPurchaseItem(r)}>
              <kbd style={kbdRowStyle}>P</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Adjust Stock">
            <Button size="small" icon={<SwapOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }} onClick={() => setAdjustItem(r)}>
              <kbd style={kbdRowStyle}>A</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Transfer Stock">
            <Button size="small" icon={<SwapOutlined />} style={{ color: "#2563eb", borderColor: "#2563eb" }} onClick={() => setTransferItem(r)}>
              <kbd style={kbdRowStyle}>T</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="View Batches">
            <Button size="small" icon={<ApartmentOutlined />} onClick={() => setBatchItem(r)}>
              <kbd style={kbdRowStyle}>B</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Upload Image">
            <Button size="small" icon={<PictureOutlined />} style={{ color: "#7c3aed", borderColor: "#7c3aed" }} onClick={() => setUploadItem(r)}>
              <kbd style={kbdRowStyle}>U</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Print Barcode">
            <Button size="small" icon={<BarcodeOutlined />} onClick={() => setBarcodeItem(r)}>
              <kbd style={kbdRowStyle}>C</kbd>
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Inventory</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Stock levels across all stores</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Tooltip title="Export Excel">
            <Button icon={<FileExcelOutlined />} loading={exporting} onClick={handleExport}
              style={{ color: "#059669", borderColor: "#059669" }}>
              <kbd style={kbdStyle}>Alt+E</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Inventory PDF">
            <Button icon={<FilePdfOutlined />} onClick={() => openDlModal("inventory")}
              style={{ color: "#dc2626", borderColor: "#dc2626" }}>
              <kbd style={kbdStyle}>Alt+I</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Category-Brand PDF">
            <Button icon={<FilePdfOutlined />} onClick={() => openDlModal("catbrand")}
              style={{ color: "#7c3aed", borderColor: "#7c3aed" }}>
              <kbd style={kbdStyle}>Alt+P</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Purchase History PDF">
            <Button icon={<DownloadOutlined />} onClick={() => exportPdf("purchase")}
              style={{ color: "#2563eb", borderColor: "#2563eb" }}>
              <kbd style={kbdStyle}>Alt+U</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Transfer History PDF">
            <Button icon={<DownloadOutlined />} onClick={() => exportPdf("transfer")}
              style={{ color: "#0891b2", borderColor: "#0891b2" }}>
              <kbd style={kbdStyle}>Alt+R</kbd>
            </Button>
          </Tooltip>
          <Tooltip title="Creation History PDF">
            <Button icon={<DownloadOutlined />} onClick={() => setHistoryModal(true)}
              style={{ color: "#d97706", borderColor: "#d97706" }}>
              <kbd style={kbdStyle}>Alt+H</kbd>
            </Button>
          </Tooltip>
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => setPurchaseItem({})}
            style={{ background: "#059669" }}>
            Purchase <kbd style={{ ...kbdStyle, background: "rgba(255,255,255,0.2)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Alt+K</kbd>
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setProductForm({ open: true, item: null })}
            style={{ background: "#2563eb", color: "#fff", borderColor: "#2563eb" }}>
            New Product <kbd style={{ ...kbdStyle, background: "rgba(255,255,255,0.2)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>Alt+N</kbd>
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      {dash && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {([
            ["Total Products", dash.overall?.totalProducts, "#2563eb", ""],
            ["Total Stock",    dash.overall?.totalStock,    "#111827", ""],
            ["In Stock",       dash.overall?.inStock,       "#059669", "IN_STOCK"],
            ["Low Stock",      dash.overall?.lowStock,      "#d97706", "LOW_STOCK"],
            ["Out of Stock",   dash.overall?.outOfStock,    "#dc2626", "OUT_OF_STOCK"],
          ] as [string, number, string, string][]).map(([label, val, color, filter]) => (
            <div key={label}
              onClick={() => { if (filter) { setStockStatus(filter); setPage(1); } }}
              style={{ background: "#fff", borderRadius: 10, padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}`, minWidth: 120, cursor: filter ? "pointer" : "default" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{val ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Store Cards */}
      {(dash?.storeWise?.length ?? 0) > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {dash.storeWise.map((s: any) => (
            <div key={s.storeId}
              onClick={() => { setStoreId(storeId === s.storeId ? "" : s.storeId); setPage(1); }}
              style={{ flex: "1 1 190px", minWidth: 170, background: "#fff", borderRadius: 10, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: `2px solid ${storeId === s.storeId ? "#111827" : "#f1f5f9"}`, cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {s.storeName}
                {storeId === s.storeId && <span style={{ fontSize: 10, background: "#111827", color: "#fff", padding: "2px 7px", borderRadius: 999 }}>Active</span>}
              </div>
              {([
                ["Products",     s.totalProducts,              "#2563eb"],
                ["Total Stock",  s.totalStock,                 "#059669"],
                ["In Stock",     s.inStock ?? 0,               "#059669"],
                ["Out of Stock", s.outOfStock ?? 0,            "#dc2626"],
                ["Stock Value",  fmtRs(s.totalStockValue),     "#111827"],
              ] as [string, any, string][]).map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "#6b7280" }}>{l}</span>
                  <span style={{ fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
              {s.warranty && (
                <>
                  <div style={{ borderTop: "1px solid #f1f5f9", margin: "6px 0" }} />
                  {([
                    ["Under Warranty", s.warranty.underWarranty, "#2563eb"],
                    ["Expiring Soon",  s.warranty.expiringSoon,  "#d97706"],
                    ["Expired",        s.warranty.expired,       "#dc2626"],
                  ] as [string, any, string][]).map(([l, v, c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: "#9ca3af" }}>{l}</span>
                      <span style={{ fontWeight: 600, color: c }}>{v ?? 0}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Input
          ref={searchRef}
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          suffix={<kbd style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 3, padding: "0 5px", fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>Alt+S</kbd>}
          placeholder="Search product / SKU…"
          value={searchInput}
          onChange={e => {
            setSearchInput(e.target.value);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => { setKeyword(e.target.value); setPage(1); }, 500);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              clearTimeout(debounceRef.current);
              setKeyword(searchInput);
              setPage(1);
              searchRef.current?.blur();
              setPendingFocusFirst(true);
            }
            if (e.key === "Escape") { setSearchInput(""); setKeyword(""); setPage(1); searchRef.current?.blur(); }
          }}
          style={{ width: 220 }}
        />
        <Select value={stockStatus} onChange={v => { setStockStatus(v); setPage(1); }} style={{ width: 140 }}
          options={[{ value: "", label: "All Status" }, { value: "IN_STOCK", label: "In Stock" }, { value: "LOW_STOCK", label: "Low Stock" }, { value: "OUT_OF_STOCK", label: "Out of Stock" }]} />
        <Select value={storeId} onChange={v => { setStoreId(v); setPage(1); }} style={{ width: 150 }}
          options={[{ value: "", label: "All Stores" }, ...stores.map((s: any) => ({ value: s.id, label: s.name }))]} />
        <Select value={brandId || undefined} onChange={v => { setBrandId(v || ""); setPage(1); }} style={{ width: 140 }}
          placeholder="All Brands" allowClear
          options={brands.map((b: any) => ({ value: b.id, label: b.name }))} />
        <Select value={masterBrandId || undefined} onChange={v => { setMasterBrandId(v || ""); setPage(1); }} style={{ width: 150 }}
          placeholder="Master Brand" allowClear
          options={masterBrands.map((mb: any) => ({ value: mb.id, label: mb.name }))} />
        <Select value={priceGroupId || undefined} onChange={v => { setPriceGroupId(v || ""); setPage(1); }} style={{ width: 150 }}
          placeholder="Price Group" allowClear
          options={[{ value: "", label: "All Price Groups" }, ...pGroups.map((pg: any) => ({ value: pg.id, label: pg.name }))]} />
        {(keyword || (stockStatus && stockStatus !== "IN_STOCK") || categoryId || brandId || masterBrandId || priceGroupId) && (
          <Button onClick={() => { setSearchInput(""); setKeyword(""); setStockStatus("IN_STOCK"); setCategoryId(""); setBrandId(""); setMasterBrandId(""); setPriceGroupId(""); setPage(1); }}>Clear</Button>
        )}
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load inventory." style={{ marginBottom: 12 }} />}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns} dataSource={items} rowKey="id"
          loading={{ spinning: listQuery.isFetching, size: "large" }}
          size="middle" scroll={{ x: "max-content" }}
          rowClassName={(r) => r.id === focusedId ? "inv-row-focused" : ""}
          onRow={(r) => ({ onClick: () => setFocusedId(r.id) })}
          pagination={{ current: page, pageSize: limit, total, onChange: p => { setPage(p); }, showSizeChanger: false, showTotal: t => `Total ${t} items` }}
        />
      </div>
      <style>{`
        .inv-row-focused td { background: #f0fdf4 !important; box-shadow: inset 0 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
        .inv-row-focused td:first-child { box-shadow: inset 2px 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
        .inv-row-focused td:last-child  { box-shadow: inset -2px 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
      `}</style>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",    label: "Move selection" },
        { key: "PgUp/PgDn", label: "Previous / Next page" },
        { key: "Esc",       label: "Clear selection" },
        { key: "Enter",     label: "Focus first row" },
        { key: "E",         label: "Edit product" },
        { key: "P",         label: "Purchase stock" },
        { key: "A",         label: "Adjust stock" },
        { key: "T",         label: "Transfer stock" },
        { key: "B",         label: "View batches" },
        { key: "U",         label: "Upload image" },
        { key: "C",         label: "Print barcode" },
        { key: "Alt+S",     label: "Focus search" },
        { key: "Alt+N",     label: "New product" },
        { key: "Alt+K",     label: "Purchase (no selection)" },
        { key: "Alt+E",     label: "Export Excel" },
        { key: "Alt+I",     label: "Inventory PDF" },
        { key: "Alt+P",     label: "Cat-Brand PDF" },
        { key: "Alt+U",     label: "Purchase History PDF" },
        { key: "Alt+R",     label: "Transfer History PDF" },
        { key: "Alt+H",     label: "Creation History PDF" },
      ]} />

      {/* ── Modals ── */}
      {purchaseItem !== null && (
        <PurchaseModal
          stores={stores}
          priceGroups={pGroups}
          initialProductId={purchaseItem?.productId || ""}
          initialProductName={purchaseItem?.product?.name || ""}
          initialStoreId={purchaseItem?.storeId || ""}
          initialCostPrice={purchaseItem?.costPrice || 0}
          initialWarrantyDays={purchaseItem?.warrantyDays || 0}
          onClose={() => setPurchaseItem(null)}
          onSuccess={({ productId, productName, quantity }) => {
            setPurchaseItem(null);
            refetchAll();
            setBarcodeItem({ productId, product: { name: productName }, _printQty: quantity });
          }}
        />
      )}

      {adjustItem && (
        <AdjustModal
          item={adjustItem} stores={stores}
          onClose={() => setAdjustItem(null)}
          onSuccess={() => { setAdjustItem(null); refetchAll(); }}
        />
      )}

      {transferItem && (
        <TransferModal
          item={transferItem} stores={stores}
          onClose={() => setTransferItem(null)}
          onSuccess={() => { setTransferItem(null); refetchAll(); }}
        />
      )}

      {batchItem && (
        <BatchModal
          item={batchItem}
          onClose={() => setBatchItem(null)}
          onPurchase={() => { setBatchItem(null); setPurchaseItem(batchItem); }}
        />
      )}

      {barcodeItem && (
        <BarcodeModal
          item={barcodeItem}
          quantity={barcodeItem?._printQty}
          onClose={() => setBarcodeItem(null)}
        />
      )}

      <Modal
        open={!!uploadItem}
        title={`Upload Image — ${uploadItem?.product?.name || ""}`}
        okText="Upload" okButtonProps={{ loading: uploading, disabled: !uploadFile }}
        onCancel={() => { setUploadItem(null); setUploadFile(null); }}
        onOk={handleUploadConfirm}
      >
        <Upload.Dragger
          accept="image/*" maxCount={1} showUploadList={!!uploadFile}
          beforeUpload={file => { setUploadFile(file); return false; }}
          onRemove={() => setUploadFile(null)}
        >
          <p style={{ fontSize: 28 }}><PictureOutlined /></p>
          <p style={{ fontSize: 13 }}>Click or drag image here</p>
          {uploadItem?.product?.imageUrl && (
            <img src={uploadItem.product.imageUrl} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, marginTop: 8 }} />
          )}
        </Upload.Dragger>
      </Modal>

      <Modal
        open={!!dlModal}
        title={dlModal === "inventory" ? "Download Inventory PDF" : "Download Category-Brand PDF"}
        okText="Download" onCancel={() => setDlModal(null)} onOk={handleDlConfirm}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Price Group <span style={{ color: "#dc2626" }}>*</span></div>
            <Select
              style={{ width: "100%" }} placeholder="Select Price Group"
              value={dlPriceGroup || undefined} onChange={setDlPriceGroup}
              options={pGroups.map((pg: any) => ({ value: pg.id, label: pg.name }))}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Store (optional)</div>
            <Select
              style={{ width: "100%" }} placeholder="All Stores" allowClear
              value={dlStore || undefined} onChange={v => setDlStore(v || "")}
              options={stores.map((s: any) => ({ value: s.id, label: s.name }))}
            />
          </div>
          {dlModal === "inventory" && (
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Category (optional)</div>
              <Select
                style={{ width: "100%" }} placeholder="All Categories" allowClear
                value={dlCategory || undefined} onChange={v => setDlCategory(v || "")}
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))} />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={historyModal} title="Creation History PDF" okText="Download"
        onCancel={() => setHistoryModal(false)}
        onOk={exportCreationHistory}
      >
        <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>Select date range</div>
        <DatePicker.RangePicker style={{ width: "100%" }}
          value={historyDates}
          onChange={v => setHistoryDates(v ? [v[0], v[1]] : [null, null])}
        />
      </Modal>

      <ProductFormDrawer
        open={productForm.open}
        editItem={productForm.item}
        onClose={() => setProductForm({ open: false, item: null })}
        onSuccess={() => { setProductForm({ open: false, item: null }); refetchAll(); }}
      />
    </div>
  );
}
