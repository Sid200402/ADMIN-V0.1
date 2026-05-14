import { useState, useEffect } from "react";
import { message } from "antd";
import { Select } from "antd";
import { barcodeService } from "../../api/services";
import { LabelPrinter } from "../../utils/labelPrinter";

interface Props {
  item: any;
  quantity?: number;
  onClose: () => void;
}

export default function BarcodeModal({ item, quantity: initialQty, onClose }: Props) {
  const [previewUrl,   setPreviewUrl]   = useState("");
  const [labelSize,    setLabelSize]    = useState("1");
  const [layoutCols,   setLayoutCols]   = useState(1);
  const [useCustom,    setUseCustom]    = useState(false);
  const [customW,      setCustomW]      = useState("57");
  const [customH,      setCustomH]      = useState("32");
  const [actualSize,   setActualSize]   = useState(true);
  const [printing,     setPrinting]     = useState(false);
  const [printQty, setPrintQty] = useState(initialQty ?? 1);

  useEffect(() => {
    (async () => {
      try {
        const res = await barcodeService.generate(item.productId);
        const url = await LabelPrinter.convertResponseToImageUrl(res);
        setPreviewUrl(url);
      } catch { /* silent */ }
    })();
  }, [item.productId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await barcodeService.generate(item.productId);
      const url = await LabelPrinter.convertResponseToImageUrl(res);
      const dim = useCustom
        ? { width: `${customW}mm`, height: `${customH}mm`, name: "Custom" }
        : LabelPrinter.LABEL_SIZES[parseInt(labelSize)];
      await LabelPrinter.printToLabelPrinter(url, dim, layoutCols, printQty);
      message.success(`Sent ${printQty} label(s) to printer`);
      onClose();
    } catch { message.error("Print failed"); }
    finally { setPrinting(false); }
  };

  const dim = useCustom
    ? { width: `${customW}mm`, height: `${customH}mm` }
    : LabelPrinter.LABEL_SIZES[parseInt(labelSize)];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1050, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 480, maxWidth: "calc(100vw - 24px)", background: "#fff", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", zIndex: 1051, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#111827,#374151)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏷️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Print Barcode</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{item.product?.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>

          {/* Quantity */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Print Quantity</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setPrintQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>−</button>
              <input type="number" min={1} value={printQty} onChange={e => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 64, textAlign: "center", padding: "6px 8px", fontSize: 15, fontWeight: 700, border: "1.5px solid #e2e8f0", borderRadius: 6, outline: "none" }} />
              <button onClick={() => setPrintQty(q => q + 1)} style={{ width: 32, height: 32, borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
              {initialQty && <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, background: "#eef2ff", padding: "2px 8px", borderRadius: 4 }}>purchased: {initialQty}</span>}
            </div>
          </div>

          {/* Label size */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Label Size</label>
            <Select
              style={{ width: "100%" }}
              value={useCustom ? "custom" : labelSize}
              onChange={v => { if (v === "custom") setUseCustom(true); else { setUseCustom(false); setLabelSize(v); } }}
              options={[
                ...LabelPrinter.LABEL_SIZES.map((s, i) => ({ value: String(i), label: s.name })),
                { value: "custom", label: "Custom Size" },
              ]}
            />
          </div>

          {/* Custom size */}
          {useCustom && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label">Width (mm)</label>
                <input type="number" className="form-control" value={customW} min={25} max={200}
                  onChange={e => setCustomW(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Height (mm)</label>
                <input type="number" className="form-control" value={customH} min={13} max={100}
                  onChange={e => setCustomH(e.target.value)} />
              </div>
            </div>
          )}

          {/* Layout */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Layout</label>
            <Select
              style={{ width: "100%" }}
              value={layoutCols}
              onChange={setLayoutCols}
              options={[
                { value: 1, label: "Single Column (1 Label)" },
                { value: 2, label: "Double Column (2 Labels)" },
              ]}
            />
          </div>

          {/* Preview */}
          {previewUrl && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label className="form-label mb-0">Preview</label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={actualSize} onChange={e => setActualSize(e.target.checked)} />
                  Actual Size
                </label>
              </div>
              <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 8, padding: 24, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 140, overflow: "auto" }}>
                <div style={{
                  width: actualSize ? "180mm" : dim.width,
                  height: actualSize ? "auto" : dim.height,
                  border: "2px dashed #2563eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#fff",
                  transform: actualSize ? "scale(1)" : "scale(2.5)",
                  transformOrigin: "center",
                }}>
                  <img src={previewUrl} alt="Barcode" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
                </div>
              </div>
              <div style={{ marginTop: 8, padding: "7px 12px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, fontSize: 12, color: "#1e40af", textAlign: "center" }}>
                {useCustom ? `${customW}mm × ${customH}mm` : LabelPrinter.LABEL_SIZES[parseInt(labelSize)]?.name}
                {" — "}{actualSize ? "Actual size" : "Enlarged 2.5× for visibility"}
              </div>
            </div>
          )}

          {!previewUrl && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 13 }}>Generating preview…</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #f1f5f9", background: "#fafafa", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            <kbd style={{ background: "#111827", color: "#00e5ff", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>Esc</kbd> close
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 9, cursor: "pointer" }}>Cancel</button>
            <button onClick={handlePrint} disabled={printing || !previewUrl}
              style={{ padding: "8px 22px", fontSize: 13, fontWeight: 700, background: printing || !previewUrl ? "#e2e8f0" : "linear-gradient(135deg,#111827,#1f2937)", color: printing || !previewUrl ? "#94a3b8" : "#fff", border: "none", borderRadius: 9, cursor: printing || !previewUrl ? "not-allowed" : "pointer" }}>
              {printing ? "Printing…" : "🖨️ Print"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
