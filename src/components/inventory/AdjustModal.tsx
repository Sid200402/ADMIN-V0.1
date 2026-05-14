import { useState, useEffect, useCallback } from "react";
import { message } from "antd";
import { inventoryService } from "../../api/services";

interface Props {
  item: any; // inventory row
  stores: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustModal({ item, stores, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState(String(item.stock ?? 0));
  const [notes,    setNotes]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const storeName = stores.find(s => s.id === item.storeId)?.name || item.store?.name || "";

  const handleSubmit = useCallback(async () => {
    if (!quantity || Number(quantity) < 0) { setError("Quantity must be ≥ 0"); return; }
    setError("");
    setSubmitting(true);
    try {
      await inventoryService.adjustStock({
        productId: item.productId,
        storeId:   item.storeId,
        quantity:  Number(quantity),
        ...(notes && { notes }),
      });
      message.success("Stock adjusted");
      onSuccess();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Adjust failed");
    } finally { setSubmitting(false); }
  }, [quantity, notes, item, onSuccess]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleSubmit, onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1050, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, maxWidth: "calc(100vw - 24px)", background: "#fff", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", zIndex: 1051, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#d97706,#b45309)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✏️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Adjust Stock</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{item.product?.name} · {storeName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e", marginBottom: 16 }}>
            Set the <strong>exact new quantity</strong> for this product in <strong>{storeName}</strong>. Current stock: <strong>{item.stock ?? 0}</strong>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">New Quantity *</label>
            <input
              autoFocus type="number" className="form-control" min={0}
              value={quantity} onChange={e => { setQuantity(e.target.value); setError(""); }}
              style={{ fontSize: 22, fontWeight: 700, textAlign: "center", padding: "10px" }}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            />
            {error && <div className="text-danger small mt-1">{error}</div>}
          </div>

          <div style={{ marginBottom: 4 }}>
            <label className="form-label">Reason / Notes</label>
            <textarea className="form-control" rows={2} placeholder="e.g. Physical stock count, damage correction…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 8 }}>
            <span><kbd style={{ background: "#111827", color: "#00e5ff", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>Alt+S</kbd> submit</span>
            <span><kbd style={{ background: "#111827", color: "#00e5ff", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>Esc</kbd> close</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 9, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ padding: "8px 22px", fontSize: 13, fontWeight: 700, background: submitting ? "#e2e8f0" : "linear-gradient(135deg,#d97706,#b45309)", color: submitting ? "#94a3b8" : "#fff", border: "none", borderRadius: 9, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Saving…" : "✓ Adjust Stock (Alt+S)"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
