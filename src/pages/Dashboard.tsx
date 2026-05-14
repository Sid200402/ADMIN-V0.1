import { useState } from "react";
import { Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import { dashboardService, storeService } from "../api/services";
import { MetricCards, emptyMain } from "../components/dashboard/MetricCards";
import { Charts } from "../components/dashboard/Charts";
import { StoreCard, DateWiseTable } from "../components/dashboard/StoreAndDateWise";
import { fmtRs, fmtNum } from "../components/dashboard/MetricCards";
import type { Period } from "../types";

type Tab = "main" | "all-stores" | "date-wise";

const periodOptions = [
  { value: "daily",       label: "Today" },
  { value: "weekly",      label: "This Week" },
  { value: "last-7-days", label: "Last 7 Days" },
  { value: "this-month",  label: "This Month" },
  { value: "yearly",      label: "This Year" },
  { value: "custom",      label: "Custom Range" },
];

// ── API fetchers via services ────────────────────────────────────────────────
const fetchStores = async () => {
  const { data } = await storeService.getAll();
  const list = Array.isArray(data) ? data : data?.result || [];
  return [
    { value: "", label: "All Stores" },
    ...list.map((s: any) => ({ value: s.id, label: s.name })),
  ];
};

const fetchMain = async (period: Period, storeId: string, startDate: string, endDate: string) => {
  const { data } = await dashboardService.getMain({
    period,
    ...(storeId ? { storeId } : {}),
    ...(period === "custom" ? { startDate, endDate } : {}),
  });
  return data;
};

const fetchAllStores = async (period: Period, startDate: string, endDate: string) => {
  const { data } = await dashboardService.getAllStores({
    period,
    ...(period === "custom" ? { startDate, endDate } : {}),
  });
  return data;
};

const fetchDateWise = async (period: Period, storeId: string, startDate: string, endDate: string) => {
  const { data } = await dashboardService.getDateWise({
    period,
    ...(storeId ? { storeId } : {}),
    ...(period === "custom" ? { startDate, endDate } : {}),
  });
  return data;
};

// ── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab]             = useState<Tab>("main");
  const [period, setPeriod]       = useState<Period>("daily");
  const [storeId, setStoreId]     = useState("");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split("T")[0]);

  const isCustomReady = period !== "custom" || (!!startDate && !!endDate);

  // ── Stores dropdown ─────────────────────────────────────────────────────
  const storesListQuery = useQuery({
    queryKey: ["stores-list"],
    queryFn: fetchStores,
    staleTime: 1000 * 60 * 10, // 10 min cache
  });

  // ── Queries ─────────────────────────────────────────────────────────────
  const mainQuery = useQuery({
    queryKey: ["db-main", period, storeId, startDate, endDate],
    queryFn: () => fetchMain(period, storeId, startDate, endDate),
    enabled: isCustomReady,
    staleTime: 30_000,
    refetchInterval: tab === "main" ? 30_000 : false,
    placeholderData: emptyMain,
  });

  const storesQuery = useQuery({
    queryKey: ["db-stores", period, startDate, endDate],
    queryFn: () => fetchAllStores(period, startDate, endDate),
    enabled: tab === "all-stores" && isCustomReady,
    staleTime: 30_000,
  });

  const dateWiseQuery = useQuery({
    queryKey: ["db-datewise", period, storeId, startDate, endDate],
    queryFn: () => fetchDateWise(period, storeId, startDate, endDate),
    enabled: tab === "date-wise" && isCustomReady,
    staleTime: 30_000,
  });

  const mainData = mainQuery.data ?? emptyMain;

  // ── Tab button ────────────────────────────────────────────────────────────
  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      style={{
        padding: "7px 18px", fontSize: 13, fontWeight: 600,
        border: "none", borderRadius: 8, cursor: "pointer",
        background: tab === t ? "#111827" : "#f1f5f9",
        color: tab === t ? "#fff" : "#374151",
        transition: "all 0.15s",
      }}
    >{label}</button>
  );

  return (
    <>
      <style>{`
        @keyframes db-wave {
          0%   { background-position: -200px 0 }
          100% { background-position: calc(200px + 100%) 0 }
        }
      `}</style>

      <div style={{ padding: "4px 0" }}>

        {/* ── Toolbar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            {tabBtn("main",       "Overview")}
            {tabBtn("all-stores", "All Stores")}
            {tabBtn("date-wise",  "Date-wise")}
          </div>

          {/* Filters */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Store filter — hidden on all-stores tab */}
            {tab !== "all-stores" && (
              <Select
                value={storeId || undefined}
                placeholder="All Stores"
                allowClear
                loading={storesListQuery.isLoading}
                onChange={(v) => setStoreId(v || "")}
                style={{ width: 200 }}
                options={storesListQuery.data || [{ value: "", label: "All Stores" }]}
              />
            )}

            {/* Period filter */}
            <Select
              value={period}
              onChange={(v) => setPeriod(v as Period)}
              style={{ width: 150 }}
              options={periodOptions}
            />

            {/* Custom date range */}
            {period === "custom" && (
              <>
                <input
                  type="date" value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
                />
                <input
                  type="date" value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
                />
              </>
            )}
          </div>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "main" && (
          <>
            <MetricCards m={mainData} shimmer={mainQuery.isFetching} />
            <Charts m={mainData} shimmer={mainQuery.isFetching} />
          </>
        )}

        {/* ── ALL STORES TAB ── */}
        {tab === "all-stores" && (
          <>
            {storesQuery.isLoading && (
              <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>Loading...</div>
            )}

            {storesQuery.data && (
              <>
                {/* Combined summary */}
                {storesQuery.data.combined && (
                  <div style={{ background: "#fff", padding: 20, marginBottom: 16, borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "2px solid #111827" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Combined Total
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                      {([
                        ["Bills",       fmtNum(storesQuery.data.combined.totalBills)],
                        ["Sale",        fmtRs(storesQuery.data.combined.saleAmount)],
                        ["Profit",      fmtRs(storesQuery.data.combined.profit)],
                        ["Expense",     fmtRs(storesQuery.data.combined.expense)],
                        ["Paid",        fmtRs(storesQuery.data.combined.totalPaid)],
                        ["Due",         fmtRs(storesQuery.data.combined.totalDue)],
                        ["Est. Income", fmtRs(storesQuery.data.combined.estimatedIncome)],
                        ["Act. Income", fmtRs(storesQuery.data.combined.actualIncome)],
                        ["COGS",        fmtRs(storesQuery.data.combined.cogs)],
                      ] as [string, string][]).map(([label, val]) => (
                        <div key={label} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e5e7eb" }}>
                          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-store cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                  {(storesQuery.data.stores || []).map((s: any) => (
                    <StoreCard key={s.storeId} s={s} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── DATE-WISE TAB ── */}
        {tab === "date-wise" && (
          <>
            {dateWiseQuery.isLoading && (
              <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>Loading...</div>
            )}
            <DateWiseTable rows={dateWiseQuery.data?.dateWise || []} />
          </>
        )}

      </div>
    </>
  );
}
