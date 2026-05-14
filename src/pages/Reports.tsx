import { useState, useEffect } from "react";
import { Table, Button, Tag, Tabs, Alert, DatePicker, Select, Typography, Space } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { reportService, storeService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import dayjs from "dayjs";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const { Text } = Typography;

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtRs = (v: any) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function SummaryCards({ summary }: { summary: any }) {
  if (!summary) return null;
  const cards = [
    ["Total Sales", fmtRs(summary.totalSales), "#2563eb"],
    ["Total Paid",  fmtRs(summary.totalPaid),  "#059669"],
    ["Total Due",   fmtRs(summary.totalDue),   "#dc2626"],
    ["Bills",       summary.billCount,          "#d97706"],
  ] as [string, any, string][];
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      {cards.map(([label, val, color]) => (
        <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}`, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color }}>{val ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

const billCols: ColumnType<any>[] = [
  { title: "Bill No.", dataIndex: "billNumber", key: "billNumber", render: (v) => <Text strong style={{ color: "#2563eb" }}>{v}</Text> },
  { title: "Date", dataIndex: "createdAt", key: "createdAt", width: 110, render: fmtDate },
  { title: "Customer", key: "customer", render: (_: any, r: any) => r.customer?.name || "Walk-in" },
  { title: "Payment", dataIndex: "paymentMethod", key: "paymentMethod", width: 100 },
  { title: "Subtotal", dataIndex: "subtotal", key: "subtotal", align: "right" as const, render: fmtRs },
  { title: "Discount", dataIndex: "discountAmount", key: "discountAmount", align: "right" as const, render: fmtRs },
  { title: "Tax", dataIndex: "taxAmount", key: "taxAmount", align: "right" as const, render: fmtRs },
  { title: "Total", dataIndex: "totalBillAmount", key: "totalBillAmount", align: "right" as const, render: (v) => <Text strong>{fmtRs(v)}</Text> },
  { title: "Paid", dataIndex: "paidAmount", key: "paidAmount", align: "right" as const, render: (v) => <Text style={{ color: "#059669" }}>{fmtRs(v)}</Text> },
  { title: "Due", dataIndex: "dueAmount", key: "dueAmount", align: "right" as const, render: (v) => <Text style={{ color: Number(v) > 0 ? "#dc2626" : "#059669" }}>{fmtRs(v)}</Text> },
  {
    title: "Status", dataIndex: "status", key: "status", align: "center" as const, width: 90,
    render: (v: string) => (
      <Tag color={{ PAID: "green", DUE: "orange", CANCELLED: "red", HOLD: "blue" }[v] || "default"}>{v}</Tag>
    ),
  },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PAID", label: "Paid" },
  { value: "DUE", label: "Due" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "HOLD", label: "Hold" },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("seven-days");
  const [storeId, setStoreId] = useState<string>("");

  // seven-days params
  const [sevenDate, setSevenDate] = useState<any>(dayjs());
  const [sevenStatus, setSevenStatus] = useState("");

  // daily params
  const [dailyDate, setDailyDate] = useState<any>(dayjs());
  const [dailyStatus, setDailyStatus] = useState("");

  // date-range params
  const [rangeStart, setRangeStart] = useState<any>(null);
  const [rangeEnd, setRangeEnd] = useState<any>(null);
  const [rangeStatus, setRangeStatus] = useState("");

  const storesQuery = useQuery({
    queryKey: ["stores-active"],
    queryFn: () => storeService.search().then((r: any) => r || []),
    staleTime: 300_000,
  });
  const stores: any[] = storesQuery.data || [];

  useEffect(() => {
    if (stores.length && !storeId) {
      const def = stores.find((s: any) => s.defaultStore) || stores[0];
      if (def) setStoreId(def.id);
    }
  }, [stores]);

  const sevenDayQ = useQuery({
    queryKey: ["rpt-7day", storeId, sevenDate?.format("YYYY-MM-DD"), sevenStatus],
    queryFn: () => reportService.getSevenDaySales({
      selectedDate: sevenDate.format("YYYY-MM-DD"),
      storeId: storeId || undefined,
      status: sevenStatus || undefined,
    }).then((r) => r.data),
    enabled: activeTab === "seven-days" && !!sevenDate,
    staleTime: 30_000,
  });

  const dailyQ = useQuery({
    queryKey: ["rpt-daily", storeId, dailyDate?.format("YYYY-MM-DD"), dailyStatus],
    queryFn: () => reportService.getDailySales({
      date: dailyDate.format("YYYY-MM-DD"),
      storeId: storeId || undefined,
      status: dailyStatus || undefined,
    }).then((r) => r.data),
    enabled: activeTab === "daily" && !!dailyDate,
    staleTime: 30_000,
  });

  const rangeQ = useQuery({
    queryKey: ["rpt-range", storeId, rangeStart?.format("YYYY-MM-DD"), rangeEnd?.format("YYYY-MM-DD"), rangeStatus],
    queryFn: () => reportService.getSalesByDateRange({
      startDate: rangeStart.format("YYYY-MM-DD"),
      endDate: rangeEnd.format("YYYY-MM-DD"),
      storeId: storeId || undefined,
      status: rangeStatus || undefined,
    }).then((r) => r.data),
    enabled: activeTab === "date-range" && !!rangeStart && !!rangeEnd,
    staleTime: 30_000,
  });

  const handleExport = async (type: "seven-days" | "daily" | "date-range") => {
    try {
      let res: any;
      if (type === "seven-days") {
        res = await reportService.exportSevenDays({ selectedDate: sevenDate.format("YYYY-MM-DD"), storeId: storeId || undefined, status: sevenStatus || undefined });
        downloadBlob(res.data, "seven-days-sales-report.xlsx");
      } else if (type === "daily") {
        res = await reportService.exportDaily({ date: dailyDate.format("YYYY-MM-DD"), storeId: storeId || undefined, status: dailyStatus || undefined });
        downloadBlob(res.data, "daily-sales-report.xlsx");
      } else {
        res = await reportService.exportDateRange({ startDate: rangeStart?.format("YYYY-MM-DD"), endDate: rangeEnd?.format("YYYY-MM-DD"), storeId: storeId || undefined, status: rangeStatus || undefined });
        downloadBlob(res.data, "sales-report.xlsx");
      }
    } catch { /* silent */ }
  };

  const storeSelect = (
    <Select
      value={storeId || undefined}
      onChange={setStoreId}
      placeholder="All Stores"
      allowClear
      style={{ width: 180 }}
      options={stores.map((s: any) => ({ value: s.id, label: s.name }))}
    />
  );

  const activeItems = activeTab === "seven-days" ? (sevenDayQ.data?.result || []) :
    activeTab === "daily" ? (dailyQ.data?.result || []) : (rangeQ.data?.result || []);

  const { rowClassName, onRow } = usePageShortcuts({
    onNew: () => {},
    isModalOpen: false,
    onCloseModal: () => {},
    items: activeItems,
  });

  const ReportTable = ({ q }: { q: any }) => (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      {q.isError && <Alert type="error" message="Failed to load report." style={{ margin: 16 }} />}
      <Table
        columns={billCols}
        dataSource={q.data?.result || []}
        rowKey="id"
        loading={q.isFetching}
        size="middle"
        scroll={{ x: "max-content" }}
        pagination={{ pageSize: 20, showTotal: (t) => `Total ${t}` }}
        rowClassName={rowClassName} onRow={onRow}
      />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Reports</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Sales reports and analytics</div>
        </div>
        {storeSelect}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: "seven-days",
            label: "7-Day Sales",
            children: (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 14, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <Space>
                    <DatePicker value={sevenDate} onChange={setSevenDate} format="YYYY-MM-DD" placeholder="Select Date" />
                    <Select value={sevenStatus} onChange={setSevenStatus} style={{ width: 140 }} options={STATUS_OPTIONS} />
                    <Button icon={<DownloadOutlined />} onClick={() => handleExport("seven-days")} style={{ color: "#059669", borderColor: "#059669" }}>Export</Button>
                  </Space>
                </div>
                <SummaryCards summary={sevenDayQ.data?.summary} />
                <ReportTable q={sevenDayQ} />
              </>
            ),
          },
          {
            key: "daily",
            label: "Daily Sales",
            children: (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 14, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <Space>
                    <DatePicker value={dailyDate} onChange={setDailyDate} format="YYYY-MM-DD" placeholder="Select Date" />
                    <Select value={dailyStatus} onChange={setDailyStatus} style={{ width: 140 }} options={STATUS_OPTIONS} />
                    <Button icon={<DownloadOutlined />} onClick={() => handleExport("daily")} style={{ color: "#059669", borderColor: "#059669" }}>Export</Button>
                  </Space>
                </div>
                <SummaryCards summary={dailyQ.data?.summary} />
                <ReportTable q={dailyQ} />
              </>
            ),
          },
          {
            key: "date-range",
            label: "Date Range",
            children: (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 14, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <Space>
                    <DatePicker.RangePicker
                      value={rangeStart && rangeEnd ? [rangeStart, rangeEnd] : null}
                      onChange={(v) => { setRangeStart(v?.[0] ?? null); setRangeEnd(v?.[1] ?? null); }}
                      format="YYYY-MM-DD"
                    />
                    <Select value={rangeStatus} onChange={setRangeStatus} style={{ width: 140 }} options={STATUS_OPTIONS} />
                    <Button icon={<DownloadOutlined />} onClick={() => handleExport("date-range")} style={{ color: "#059669", borderColor: "#059669" }}>Export</Button>
                  </Space>
                </div>
                <SummaryCards summary={rangeQ.data?.summary} />
                <ReportTable q={rangeQ} />
              </>
            ),
          },
        ]}
      />

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",   label: "Navigate rows" },
        { key: "Alt+1/2/3", label: "Switch tabs" },
        { key: "Esc",       label: "Clear selection" },
      ]} />
    </div>
  );
}
