import { useNavigate } from "react-router-dom";

export const fmtRs = (v: any) =>
  `Rs ${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export const fmtNum = (v: any) => Number(v ?? 0).toLocaleString("en-IN");

export const graphGroupByPeriod: Record<string, string> = {
  daily: "day", weekly: "day", "last-7-days": "day",
  "this-month": "day", yearly: "month", custom: "day",
};

export const formatLabel = (label: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label))
    return new Date(label + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (/^\d{4}-W\d{2}$/.test(label)) return "Wk " + label.split("-W")[1];
  if (/^\d{4}-\d{2}$/.test(label))
    return new Date(label + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short" });
  return label;
};

export const emptyMain = {
  totalBills: 0, saleAmount: 0, totalReturns: 0, profit: 0,
  expense: 0, estimatedIncome: 0, actualIncome: 0, totalPaid: 0,
  totalDue: 0, cogs: 0, totalInventory: 0, totalInventoryValue: 0,
  incomeVsExpenses: [{ label: new Date().toISOString().split("T")[0], income: 0, expense: 0 }],
};

export const MetricCards = ({ m, shimmer }: { m: any; shimmer?: boolean }) => {
  const navigate = useNavigate();
  const cards = [
    { title: "Total Bills",      value: fmtNum(m?.totalBills),         color: "#2563EB", link: "/bills" },
    { title: "Sale Amount",      value: fmtRs(m?.saleAmount),          color: "#7C3AED" },
    { title: "Total Returns",    value: fmtRs(m?.totalReturns),        color: "#F97316" },
    { title: "Profit",           value: fmtRs(m?.profit),              color: (m?.profit ?? 0) < 0 ? "#DC2626" : "#059669" },
    { title: "Expense",          value: fmtRs(m?.expense),             color: "#DC2626", link: "/expense" },
    { title: "Estimated Income", value: fmtRs(m?.estimatedIncome),     color: "#0891B2" },
    { title: "Actual Income",    value: fmtRs(m?.actualIncome),        color: "#059669" },
    { title: "Total Paid",       value: fmtRs(m?.totalPaid),           color: "#059669" },
    { title: "Total Due",        value: fmtRs(m?.totalDue),            color: "#DC2626" },
    { title: "COGS",             value: fmtRs(m?.cogs),                color: "#0891B2" },
    { title: "Total Inventory",  value: fmtNum(m?.totalInventory),     color: "#7C3AED", link: "/inventory" },
    { title: "Inventory Value",  value: fmtRs(m?.totalInventoryValue), color: "#2563EB" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
      {cards.map((c, i) => (
        <div
          key={i}
          onClick={() => c.link && navigate(c.link)}
          style={{ cursor: c.link ? "pointer" : "default", transition: "transform 0.15s" }}
          onMouseEnter={e => { if (c.link) (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
        >
          <div style={{
            background: "#fff", borderRadius: 14, padding: "18px 20px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            borderLeft: `4px solid ${c.color}`,
            position: "relative", overflow: "hidden",
          }}>
            {shimmer && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 2,
                background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.6) 50%,transparent 100%)",
                backgroundSize: "200px 100%", animation: "db-wave 1.4s infinite", pointerEvents: "none",
              }} />
            )}
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {c.title}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
            {c.link && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>Click to view →</div>}
          </div>
        </div>
      ))}
    </div>
  );
};
