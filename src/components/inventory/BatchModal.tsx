import { useState, useEffect } from "react";
import { message } from "antd";
import { inventoryService } from "../../api/services";

const fmtRs = (v: any) => v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";

const WARRANTY_COLOR: Record<string, string> = {
  UNDER_WARRANTY: "#2563eb", EXPIRING_SOON: "#d97706", EXPIRED: "#dc2626",
};
const warrantyLabel = (s: string) => {
  if (s === "UNDER_WARRANTY") return "Warranty";
  if (s === "EXPIRING_SOON")  return "Exp. Soon";
  if (s === "EXPIRED")        return "Expired";
  return "No Warranty";
};

interface Props {
  item: any;           // inventory row
  onClose: () => void;
  onPurchase: () => void; // open purchase modal for this item
}

export default function BatchModal({ item, onClose, onPurchase }: Props) {
  const [batches,      setBatches]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [legacyLoading, setLegacyLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await inventoryService.getBatches(item.productId, item.storeId);
        setBatches(Array.isArray(r.data) ? r.data : r.data?.batches || []);
      } catch { setBatches([]); }
      finally { setLoading(false); }
    })();
  }, [item.productId, item.storeId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleCreateLegacy = async () => {
    setLegacyLoading(true);
    try {
      await inventoryService.createLegacyBatch(item.productId, item.storeId);
      message.success("Legacy batch created");
      const r = await inventoryService.getBatches(item.productId, item.storeId);
      setBatches(Array.isArray(r.data) ? r.data : r.data?.batches || []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Failed to create legacy batch");
    } finally { setLegacyLoading(false); }
  };

  const storeName   = item.store?.name || "";
  const productName = item.product?.name || "";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1050, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(92vw, 860px)", background: "#fff", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", zIndex: 1051, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#111827,#374151)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Batch Details</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{productName} · {storeName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20 }}>✕</button>
        </div>

        {/* Info bar */}
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#374151", flexShrink: 0 }}>
          Store: <strong>{storeName}</strong> &nbsp;·&nbsp; Total Stock: <strong>{item.stock ?? 0}</strong>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 13 }}>Loading batches…</div>
          ) : batches.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Batch #", "Initial Qty", "Current Qty", "Sold", "Cost Price", "Received", "Warranty Days", "Warranty End", "Supplier", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1.5px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, i) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 600, fontSize: 12 }}>{b.batchNumber}</td>
                      <td style={{ padding: "10px 12px" }}>{b.initialQuantity}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>{b.currentQuantity}</td>
                      <td style={{ padding: "10px 12px", color: "#dc2626" }}>{b.soldQuantity}</td>
                      <td style={{ padding: "10px 12px" }}>{fmtRs(b.costPrice)}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 12 }}>
                        {b.receivedDate ? new Date(b.receivedDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{b.warrantyDays ? `${b.warrantyDays}d` : "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 12 }}>
                        {b.warrantyEndDate ? new Date(b.warrantyEndDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12 }}>{b.supplierName || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {b.warrantyStatus ? (
                          <span style={{ background: WARRANTY_COLOR[b.warrantyStatus] || "#6b7280", color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                            {warrantyLabel(b.warrantyStatus)}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>No batches found</div>
              {(item.stock ?? 0) > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                    This product has stock but no batch records.<br />Create a legacy batch to migrate existing inventory.
                  </div>
                  <button
                    onClick={handleCreateLegacy} disabled={legacyLoading}
                    style={{ padding: "9px 22px", fontSize: 13, fontWeight: 700, background: legacyLoading ? "#e5e7eb" : "#111827", color: legacyLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, cursor: legacyLoading ? "not-allowed" : "pointer" }}>
                    {legacyLoading ? "Creating…" : "⚡ Create Legacy Batch"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                    This product has <strong>0 stock</strong> in this store.<br />Add stock first — a batch will be created automatically.
                  </div>
                  <button
                    onClick={() => { onClose(); onPurchase(); }}
                    style={{ padding: "9px 22px", fontSize: 13, fontWeight: 700, background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    ➕ Purchase Stock
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid #f1f5f9", background: "#fafafa", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 9, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </>
  );
}
