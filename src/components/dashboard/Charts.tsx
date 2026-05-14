import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, Tooltip, Legend, BarElement,
  CategoryScale, LinearScale, ArcElement,
  type ChartOptions,
} from "chart.js";
import { formatLabel } from "./MetricCards";

ChartJS.register(Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const barOptions: ChartOptions<"bar"> = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 20, font: { size: 12 } } } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 }, callback: (v) => "Rs " + Number(v).toLocaleString() } },
  },
};

const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
    tooltip: { callbacks: { label: (ctx) => ` Rs ${Number(ctx.raw).toLocaleString()}` } },
  },
};

const hBarOptions: ChartOptions<"bar"> = {
  responsive: true, maintainAspectRatio: false,
  indexAxis: "y" as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, ticks: { callback: (v) => "Rs " + Number(v).toLocaleString(), font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.05)" } },
    y: { grid: { display: false }, ticks: { font: { size: 12 } } },
  },
};

export const Charts = ({ m, shimmer }: { m: any; shimmer?: boolean }) => {
  const graph = m?.incomeVsExpenses || [{ label: new Date().toISOString().split("T")[0], income: 0, expense: 0 }];

  const incomeExpenseChart = {
    labels: graph.map((d: any) => formatLabel(d.label)),
    datasets: [
      { label: "Income",   data: graph.map((d: any) => d.income),  backgroundColor: "#14B8A6", borderRadius: 6 },
      { label: "Expenses", data: graph.map((d: any) => d.expense), backgroundColor: "#F43F5E", borderRadius: 6 },
    ],
  };

  const profitChart = {
    labels: ["COGS", "Expense", "Profit"],
    datasets: [{
      data: [m?.cogs ?? 0, m?.expense ?? 0, Math.max(m?.profit ?? 0, 0)],
      backgroundColor: ["#0891B2", "#F43F5E", "#059669"], borderWidth: 0,
    }],
  };

  const paymentChart = {
    labels: ["Paid", "Due"],
    datasets: [{
      data: [m?.totalPaid ?? 0, m?.totalDue ?? 0],
      backgroundColor: ["#14B8A6", "#F97316"], borderWidth: 0,
    }],
  };

  const incomeCompareChart = {
    labels: ["Estimated Income", "Actual Income"],
    datasets: [{
      label: "Amount",
      data: [m?.estimatedIncome ?? 0, m?.actualIncome ?? 0],
      backgroundColor: ["#7C3AED", "#059669"], borderRadius: 8,
    }],
  };

  return (
    <>
      {/* Income vs Expenses Bar Chart */}
      <div style={{ background: "#fff", padding: 20, marginBottom: 16, position: "relative", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        {shimmer && (
          <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.6) 50%,transparent 100%)", backgroundSize: "200px 100%", animation: "db-wave 1.4s infinite", pointerEvents: "none" }} />
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Income vs Expenses</div>
        <div style={{ height: 320 }}><Bar data={incomeExpenseChart} options={barOptions} /></div>
      </div>

      {/* 3 small charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        {[
          { title: "Profit Breakdown",            chart: <Doughnut data={profitChart}       options={doughnutOptions} /> },
          { title: "Payment Status",              chart: <Doughnut data={paymentChart}      options={doughnutOptions} /> },
          { title: "Estimated vs Actual Income",  chart: <Bar      data={incomeCompareChart} options={hBarOptions}    /> },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", padding: 20, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{c.title}</div>
            <div style={{ height: 240 }}>{c.chart}</div>
          </div>
        ))}
      </div>
    </>
  );
};
