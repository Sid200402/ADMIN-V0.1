import { useState, useEffect, useCallback } from "react";
import { message } from "antd";
import { inventoryService } from "../../api/services";

interface Props {
  item: any;
  stores: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({ item, stores, onClose, onSuccess }: Props) {
  const [toStoreId, setToStoreId] = useState("");
  const [quantity,  setQuantity]  = useState("");
  const [notes,     setNotes]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors,    setErrors]    = useState<any>({});

  const fromStoreName = stores.find(s => s.id === item.storeId)?.name || item.store?.name || "";
  const destStores    = stores.filter(s => s.id !== item.storeId);

  const handleSubmit = useCallback(async () => {
    const errs: any = {};
    if (!toStoreId)                          errs.toStoreId = "Select destination store";
    if (!quantity || Number(quantity) <= 0)  errs.quantity  = "Must be > 0";
    if (Number(quantity) > (item.stock ?? 0)) errs.quantity = `Max available: ${item.stock ?? 0}`;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      await inventoryService.transferStock({
        productId:   item.productId,
        fromStoreId: item.storeId,
        toStoreId,
        quantity:    Number(quantity),
        ...(notes && { notes }),
      });
      message.success("Stock transferred");
      onSuccess();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Transfer failed");
    } finally { setSubmitting(false); }
  }, [toStoreId, quantity, notes, item, onSuccess]);

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
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 460, maxWidth: "calc(100vw - 24px)", background: "#fff", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", zIndex: 1051, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔄</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Transfer Stock</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{item.product?.name} · from {fromStoreName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>

          {/* From store (read-only) */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">From Store</label>
            <input className="form-control" value={fromStoreName} disabled style={{ background: "#f9fafb", fontWeight: 600 }} />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Available stock: <strong>{item.stock ?? 0}</strong></div>
          </div>

          {/* To store */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">To Store *</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {destStores.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { setToStoreId(s.id); setErrors((p: any) => ({ ...p, toStoreId: "" })); }}
                  style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `2px solid ${toStoreId === s.id ? "#2563eb" : "#e2e8f0"}`, background: toStoreId === s.id ? "#2563eb" : "#fff", color: toStoreId === s.id ? "#fff" : "#374151" }}>
                  {s.name}
                </button>
              ))}
            </div>
            {errors.toStoreId && <div className="text-danger small mt-1">{errors.toStoreId}</div>}
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Quantity to Transfer *</label>
            <input
              autoFocus type="number" className="form-control" min={1} max={item.stock ?? 0}
              placeholder="0" value={quantity}
              onChange={e => { setQuantity(e.target.value); setErrors((p: any) => ({ ...p, quantity: "" })); }}
              style={{ fontSize: 20, fontWeight: 700, textAlign: "center", padding: "10px" }}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            />
            {errors.quantity && <div className="text-danger small mt-1">{errors.quantity}</div>}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 4 }}>
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} placeholder="Reason for transfer…"
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
              style={{ padding: "8px 22px", fontSize: 13, fontWeight: 700, background: submitting ? "#e2e8f0" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color: submitting ? "#94a3b8" : "#fff", border: "none", borderRadius: 9, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Transferring…" : "✓ Transfer Stock (Alt+S)"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
