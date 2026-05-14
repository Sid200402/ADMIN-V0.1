import { fmtRs, fmtNum } from "./MetricCards";

// ── Store Card ────────────────────────────────────────────────────────────
export const StoreCard = ({ s }: { s: any }) => (
  <div style={{ background: "#fff", padding: 16, marginBottom: 12, borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1.5px solid #f1f5f9" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#111827,#374151)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        {(s.storeName || s.storeCode || "S")[0]}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{s.storeName || "—"}</div>
        {s.storeCode && <div style={{ fontSize: 11, color: "#9ca3af" }}>Code: {s.storeCode}</div>}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
      {[
        ["Bills",       fmtNum(s.totalBills)],
        ["Sale",        fmtRs(s.saleAmount)],
        ["Profit",      fmtRs(s.profit)],
        ["Expense",     fmtRs(s.expense)],
        ["Paid",        fmtRs(s.totalPaid)],
        ["Due",         fmtRs(s.totalDue)],
        ["Est. Income", fmtRs(s.estimatedIncome)],
        ["Act. Income", fmtRs(s.actualIncome)],
        ["COGS",        fmtRs(s.cogs)],
        ["Inventory",   fmtNum(s.totalInventory)],
      ].map(([label, val]) => (
        <div key={label} style={{ padding: "5px 8px", background: "#f8fafc", borderRadius: 7 }}>
          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{val}</div>
        </div>
      ))}
    </div>
  </div>
);

// ── Date-wise Table ───────────────────────────────────────────────────────
export const DateWiseTable = ({ rows }: { rows: any[] }) => (
  <div style={{ overflowX: "auto", border: "1.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr style={{ background: "#f8fafc" }}>
          {["Date", "Bills", "Sale", "Returns", "Profit", "Expense", "Est. Income", "Act. Income", "Paid", "Due", "COGS"].map(h => (
            <th key={h} style={{ padding: "10px 12px", textAlign: h === "Date" ? "left" : "right", fontWeight: 700, color: "#374151", whiteSpace: "nowrap", borderBottom: "1.5px solid #e5e7eb" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{r.date}</td>
            <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmtNum(r.totalBills)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#7C3AED", fontWeight: 600 }}>{fmtRs(r.saleAmount)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#F97316" }}>{fmtRs(r.totalReturns)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: (r.profit ?? 0) < 0 ? "#DC2626" : "#059669", fontWeight: 600 }}>{fmtRs(r.profit)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#DC2626" }}>{fmtRs(r.expense)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#0891B2" }}>{fmtRs(r.estimatedIncome)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669", fontWeight: 600 }}>{fmtRs(r.actualIncome)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669" }}>{fmtRs(r.totalPaid)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#DC2626" }}>{fmtRs(r.totalDue)}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#0891B2" }}>{fmtRs(r.cogs)}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={11} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>No data</td></tr>
        )}
      </tbody>
    </table>
  </div>
);
