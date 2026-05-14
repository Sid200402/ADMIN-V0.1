import { useState, useEffect, useCallback, useRef } from "react";
import { message, InputNumber, Input, Modal } from "antd";
import api from "../../api/axiosInstance";
import { inventoryService, storeService } from "../../api/services";

const fmtRs = (v: any) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";

interface PgPrice {
  id: string;
  name: string;
  price: number | null;
  existing: number;
}

function ProductSearch({
  value,
  name,
  onChange,
}: {
  value: string;
  name: string;
  onChange: (id: string, name: string, data?: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!open) return;
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await api.get(
          `/product/admin?limit=30&offset=0&keyword=${encodeURIComponent(query)}`
        );
        setOptions(r.data?.result || []);
        setHi(0);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query, open]);

  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-idx="${hi}"]`
    ) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [hi]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      const inWrap = wrapRef.current?.contains(target);
      const inList = listRef.current?.contains(target);
      if (!inWrap && !inList) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const select = (o: any) => {
    onChange(o.id, o.name, o);
    setOpen(false);
    setQuery("");
  };

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: "#fef08a", padding: 0, borderRadius: 2 }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  if (value && name) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 13px",
          background: "#f0fdf4",
          border: "1.5px solid #86efac",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#111827",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        <button
          onClick={() => {
            onChange("", "");
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#9ca3af",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
            padding: "2px 5px",
            borderRadius: 4,
            flexShrink: 0,
          }}
          title="Clear"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14,
            color: "#9ca3af",
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          autoFocus
          style={{
            width: "100%",
            padding: "9px 36px 9px 34px",
            fontSize: 13,
            border: `1.5px solid ${open ? "#6366f1" : "#e2e8f0"}`,
            borderRadius: 10,
            outline: "none",
            color: "#111827",
            background: "#fff",
            boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.10)" : "none",
            transition: "all 0.15s",
          }}
          placeholder="Search by name or SKU…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHi((i) => Math.min(i + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (options[hi]) select(options[hi]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading && (
          <span
            style={{
              position: "absolute",
              right: 11,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            searching…
          </span>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 12,
            zIndex: 9999,
            boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
            maxHeight: 480,   // ← increased from 320
            overflowY: "auto",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {!loading && options.length === 0 && (
            <li
              style={{
                padding: "18px 16px",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              {query ? "No products found" : "Start typing to search…"}
            </li>
          )}
          {options.map((o, idx) => (
            <li
              key={o.id}
              data-idx={idx}
              role="option"
              aria-selected={idx === hi}
              onClick={() => select(o)}
              onMouseEnter={() => setHi(idx)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                background: idx === hi ? "#f0f9ff" : "#fff",
                borderLeft: `3px solid ${idx === hi ? "#6366f1" : "transparent"
                  }`,
                transition: "background 0.1s",
              }}
            >
              {o.imageUrl ? (
                <img
                  src={o.imageUrl}
                  alt=""
                  style={{
                    width: 38,
                    height: 38,
                    objectFit: "cover",
                    borderRadius: 7,
                    border: "1px solid #f1f5f9",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 7,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  📦
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#111827",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {highlight(o.name)}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#6366f1",
                      fontWeight: 600,
                      background: "#eef2ff",
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {o.sku}
                  </span>
                  {o.category?.name && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      {o.category.name}
                    </span>
                  )}
                  {o.brand?.name && (
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      {o.brand.name}
                    </span>
                  )}
                </div>
              </div>
              {o.purchasePrice && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#059669",
                    flexShrink: 0,
                  }}
                >
                  ₹{Number(o.purchasePrice).toLocaleString("en-IN")}
                </div>
              )}
            </li>
          ))}
          {options.length > 0 && (
            <li
              style={{
                padding: "5px 12px",
                background: "#f8fafc",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                gap: 12,
                fontSize: 10,
                color: "#9ca3af",
              }}
            >
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>Esc close</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── PurchaseModal ─────────────────────────────────────────────────────────────
interface Props {
  stores: any[];
  priceGroups: any[];
  initialProductId?: string;
  initialProductName?: string;
  initialStoreId?: string;
  initialCostPrice?: number;
  initialWarrantyDays?: number;
  onClose: () => void;
  onSuccess: (info: {
    productId: string;
    productName: string;
    quantity: number;
  }) => void;
}

export default function PurchaseModal({
  stores,
  priceGroups,
  initialProductId = "",
  initialProductName = "",
  initialStoreId = "",
  initialCostPrice = 0,
  initialWarrantyDays = 0,
  onClose,
  onSuccess,
}: Props) {
  const [productId, setProductId] = useState(initialProductId);
  const [productName, setProductName] = useState(initialProductName);
  const [storeId, setStoreId] = useState(
    initialStoreId || stores.find((s) => s.defaultStore)?.id || ""
  );
  const [internalStores, setInternalStores] = useState<any[]>(stores);

  useEffect(() => {
    if (stores.length) {
      setInternalStores(stores);
      return;
    }
    storeService
      .search()
      .then((r: any) => {
        const list: any[] = r.data?.result || r.data || [];
        setInternalStores(list);
        if (!initialStoreId) {
          const def = list.find((s: any) => s.defaultStore);
          if (def) setStoreId(def.id);
        }
      })
      .catch(() => { });
  }, [stores]);

  const [batches, setBatches] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [costPrice, setCostPrice] = useState<number | null>(
    initialCostPrice || null
  );
  const [existingCost, setExistingCost] = useState(initialCostPrice);
  const [warrantyDays, setWarrantyDays] = useState<number | null>(
    initialWarrantyDays || null
  );
  const [supplier, setSupplier] = useState("");
  const [supplierBatch, setSupplierBatch] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [pgPrices, setPgPrices] = useState<PgPrice[]>(
    priceGroups.map((pg) => ({
      id: pg.id,
      name: pg.name,
      price: null,
      existing: pg.price || 0,
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialProductId) return;
    api
      .get(`/product/admin/${initialProductId}`)
      .then((r) => {
        const pd = r.data;
        if (pd?.purchasePrice) {
          const p = parseFloat(pd.purchasePrice);
          setCostPrice(p);
          setExistingCost(p);
        }
        if (Array.isArray(pd?.productPrices) && pd.productPrices.length > 0) {
          setPgPrices(
            pd.productPrices.map((pp: any) => ({
              id: pp.priceGroup?.id,
              name: pp.priceGroup?.name || "",
              price: null,
              existing: parseFloat(pp.price) || 0,
            }))
          );
        }
      })
      .catch(() => { });
  }, [initialProductId]);

  useEffect(() => {
    if (!productId || !storeId) {
      setBatches([]);
      return;
    }
    setBatchLoading(true);
    inventoryService
      .getBatches(productId, storeId)
      .then((r) =>
        setBatches(Array.isArray(r.data) ? r.data : r.data?.batches || [])
      )
      .catch(() => setBatches([]))
      .finally(() => setBatchLoading(false));
  }, [productId, storeId]);

  const handleProductSelect = async (id: string, name: string) => {
    setProductId(id);
    setProductName(name);
    setBatchId("");
    if (!id) return;
    try {
      const [pr, pgr] = await Promise.all([
        api.get(`/product/admin/${id}`),
        api.get(`/price-group/active`),
      ]);
      const pd = pr.data;
      if (pd?.purchasePrice) {
        const p = parseFloat(pd.purchasePrice);
        setCostPrice(p);
        setExistingCost(p);
      }
      const pgMap: Record<string, number> = {};
      for (const pg of pgr.data?.result || pgr.data || [])
        pgMap[pg.id] = pg.serialNo ?? 999;
      if (Array.isArray(pd?.productPrices)) {
        setPgPrices(
          [...pd.productPrices]
            .sort(
              (a: any, b: any) =>
                (pgMap[a.priceGroup?.id] ?? 999) -
                (pgMap[b.priceGroup?.id] ?? 999)
            )
            .map((pp: any) => ({
              id: pp.priceGroup?.id,
              name: pp.priceGroup?.name || "",
              price: null,
              existing: parseFloat(pp.price) || 0,
            }))
        );
      }
    } catch {
      /* silent */
    }
  };

  const isNewBatch = !batchId;
  const selectedBatch = batches.find((b) => b.id === batchId);
  const canSubmit = !!productId && !!storeId && (quantity ?? 0) > 0;

  const handleSubmit = useCallback(async () => {
    const errs: Record<string, string> = {};
    if (!productId) errs.productId = "Select a product";
    if (!storeId) errs.storeId = "Select a store";
    if (!quantity || quantity <= 0) errs.quantity = "Qty must be > 0";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload: any = { productId, storeId, quantity };
    if (batchId) {
      payload.batchId = batchId;
    } else {
      if (costPrice) payload.costPrice = costPrice;
      if (warrantyDays && warrantyDays > 0) payload.warrantyDays = warrantyDays;
      if (supplier) payload.supplierName = supplier;
      if (supplierBatch) payload.supplierBatchNumber = supplierBatch;
      if (batchNumber) payload.batchNumber = batchNumber;
      if (notes) payload.notes = notes;
      if (costPrice) payload.updateProductPrice = true;
      const filled = pgPrices.filter((p: PgPrice) => p.price && p.price > 0);
      if (filled.length)
        payload.priceGroupPrices = filled.map((p: PgPrice) => ({
          priceGroupId: p.id,
          price: p.price,
        }));
    }

    setSubmitting(true);
    try {
      await inventoryService.purchaseStock(payload);
      message.success("Stock purchased successfully");
      onSuccess({ productId, productName, quantity: quantity! });
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    productId,
    storeId,
    quantity,
    batchId,
    costPrice,
    warrantyDays,
    supplier,
    supplierBatch,
    batchNumber,
    notes,
    pgPrices,
    onSuccess,
  ]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleSubmit, onClose]);

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 5,
  };

  const sectionBoxStyle: React.CSSProperties = {
    padding: "13px 15px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 10,
  };

  return (
    <Modal
      open
      onCancel={onClose}
      width={720}                  // ← increased from 680
      footer={null}
      closable={false}
      styles={{ body: { padding: 0 } }}
      style={{ top: 20 }}          // ← moved up from 40
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid #f1f5f9",
          background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "#111827",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🛒
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              Purchase Stock
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {productName
                ? `${productName}${storeId
                  ? ` · ${internalStores.find((s) => s.id === storeId)?.name
                  }`
                  : ""
                }`
                : "Select product and store"}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Body (scrollable) ── */}
      <div
        style={{
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "calc(100vh - 160px)",   // ← increased from calc(100vh - 220px)
          overflowY: "auto",
        }}
      >
        {/* Product */}
        {!initialProductId && (
          <div>
            <div style={labelStyle}>Product *</div>
            <ProductSearch
              value={productId}
              name={productName}
              onChange={handleProductSelect}
            />
            {errors.productId && (
              <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                {errors.productId}
              </div>
            )}
          </div>
        )}

        {/* Store */}
        <div>
          <div style={labelStyle}>Store *</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {internalStores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStoreId(s.id);
                  setBatchId("");
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `2px solid ${storeId === s.id ? "#111827" : "#e2e8f0"
                    }`,
                  background: storeId === s.id ? "#111827" : "#fff",
                  color: storeId === s.id ? "#fff" : "#374151",
                  transition: "all 0.12s",
                }}
              >
                {s.name}
                {s.defaultStore && (
                  <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
                    (Default)
                  </span>
                )}
              </button>
            ))}
          </div>
          {errors.storeId && (
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
              {errors.storeId}
            </div>
          )}
        </div>

        {/* Batch */}
        {productId && storeId && (
          <div>
            <div style={labelStyle}>
              Batch{" "}
              {batchLoading && (
                <span
                  style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}
                >
                  loading…
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "", label: "＋ New Batch", sub: "auto-generate" },
                ...batches.map((b) => ({
                  id: b.id,
                  label: b.batchNumber,
                  sub: `${b.currentQuantity} pcs · ${fmtRs(b.costPrice)}`,
                })),
              ].map((opt) => {
                const isSel = batchId === opt.id;
                const isNew = opt.id === "";
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBatchId(opt.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `2px solid ${isSel ? (isNew ? "#111827" : "#059669") : "#e2e8f0"
                        }`,
                      background: isSel
                        ? isNew
                          ? "#111827"
                          : "#f0fdf4"
                        : "#fff",
                      color: isSel
                        ? isNew
                          ? "#fff"
                          : "#059669"
                        : "#374151",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    <span>{opt.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 400,
                        color: isSel
                          ? isNew
                            ? "#9ca3af"
                            : "#059669"
                          : "#94a3b8",
                      }}
                    >
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {!isNewBatch && selectedBatch && (
              <div
                style={{
                  marginTop: 8,
                  padding: "7px 12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#059669",
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  Available: <strong>{selectedBatch.currentQuantity}</strong>
                </span>
                <span>
                  Cost: <strong>{fmtRs(selectedBatch.costPrice)}</strong>
                </span>
                {selectedBatch.supplierName && (
                  <span>Supplier: {selectedBatch.supplierName}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quantity + Cost Price */}
        {productId && storeId && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isNewBatch ? "1fr 1fr" : "1fr",
              gap: 12,
            }}
          >
            <div>
              <div style={labelStyle}>Quantity *</div>
              <InputNumber
                autoFocus={!!initialProductId}
                min={1}
                controls={false}
                style={{ width: "100%", fontSize: 20, fontWeight: 700 }}
                value={quantity}
                onChange={(v) => {
                  setQuantity(v);
                  setErrors((p) => ({ ...p, quantity: "" }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown")
                    e.preventDefault();
                  else if (e.key === "Enter") handleSubmit();
                }}
              />
              {errors.quantity && (
                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
                  {errors.quantity}
                </div>
              )}
            </div>

            {isNewBatch && (
              <div>
                <div style={labelStyle}>
                  Cost Price{" "}
                  {existingCost > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#9ca3af",
                        fontWeight: 400,
                      }}
                    >
                      existing: {fmtRs(existingCost)}
                    </span>
                  )}
                </div>
                <InputNumber
                  min={0}
                  step={0.01}
                  controls={false}
                  prefix="₹"
                  style={{ width: "100%" }}
                  placeholder={
                    existingCost > 0 ? String(existingCost) : "0.00"
                  }
                  value={costPrice}
                  onChange={setCostPrice}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown")
                      e.preventDefault();
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Selling Prices */}
        {productId && storeId && isNewBatch && pgPrices.length > 0 && (
          <div style={sectionBoxStyle}>
            <div style={sectionTitleStyle}>
              Selling Prices{" "}
              <span
                style={{
                  fontWeight: 400,
                  textTransform: "none",
                  fontSize: 10,
                }}
              >
                (leave blank to keep existing)
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              {pgPrices.map((pg: PgPrice, i: number) => (
                <div key={pg.id}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#374151",
                      display: "block",
                      marginBottom: 3,
                    }}
                  >
                    {pg.name}
                  </label>
                  <InputNumber
                    min={0}
                    step={0.01}
                    prefix="₹"
                    style={{ width: "100%" }}
                    placeholder={
                      pg.existing > 0
                        ? `existing: ${Number(pg.existing).toLocaleString(
                          "en-IN"
                        )}`
                        : "0.00"
                    }
                    value={pg.price}
                    controls={false}
                    onChange={(v) => {
                      const u = [...pgPrices];
                      u[i] = { ...u[i], price: v };
                      setPgPrices(u);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp" || e.key === "ArrowDown")
                        e.preventDefault();
                    }}
                  />
                  {pg.existing > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#059669",
                        marginTop: 3,
                        fontWeight: 500,
                      }}
                    >
                      Current: ₹{Number(pg.existing).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warranty & Supplier */}
        {productId && storeId && isNewBatch && (
          <div style={sectionBoxStyle}>
            <div style={sectionTitleStyle}>
              Warranty &amp; Supplier{" "}
              <span
                style={{
                  fontWeight: 400,
                  textTransform: "none",
                  fontSize: 10,
                }}
              >
                (optional)
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <div style={labelStyle}>Warranty Days</div>
                <InputNumber
                  min={0}
                  controls={false}
                  style={{ width: "100%" }}
                  placeholder="0 = no warranty"
                  value={warrantyDays}
                  onChange={setWarrantyDays}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown")
                      e.preventDefault();
                  }}
                />
              </div>
              <div>
                <div style={labelStyle}>Batch Number</div>
                <Input
                  placeholder="Auto-generated"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />
              </div>
              <div>
                <div style={labelStyle}>Supplier Name</div>
                <Input
                  placeholder="e.g. ABC Supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
              <div>
                <div style={labelStyle}>Supplier Batch No.</div>
                <Input
                  placeholder="SUP-001"
                  value={supplierBatch}
                  onChange={(e) => setSupplierBatch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <div style={labelStyle}>Notes</div>
              <Input.TextArea
                rows={2}
                placeholder="Optional notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      {/* ── END Body ── */}

      {/* ── Footer ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          borderTop: "1px solid #f1f5f9",
          background: "#fafafa",
          borderRadius: "0 0 8px 8px",
        }}
      >
        <div
          style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 8 }}
        >
          <span>
            <kbd
              style={{
                background: "#111827",
                color: "#00e5ff",
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 10,
                fontFamily: "monospace",
              }}
            >
              Alt+S
            </kbd>{" "}
            submit
          </span>
          <span>
            <kbd
              style={{
                background: "#111827",
                color: "#00e5ff",
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 10,
                fontFamily: "monospace",
              }}
            >
              Esc
            </kbd>{" "}
            close
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              background: "#f1f5f9",
              color: "#374151",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            style={{
              padding: "8px 24px",
              fontSize: 13,
              fontWeight: 700,
              background: submitting || !canSubmit ? "#e2e8f0" : "#111827",
              color: submitting || !canSubmit ? "#94a3b8" : "#fff",
              border: "none",
              borderRadius: 9,
              cursor: submitting || !canSubmit ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving…" : "✓ Confirm Purchase (Alt+S)"}
          </button>
        </div>
      </div>
      {/* ── END Footer ── */}
    </Modal>
  );
}