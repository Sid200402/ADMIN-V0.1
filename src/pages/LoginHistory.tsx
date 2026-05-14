import { useState, useRef } from "react";
import { Table, Input, DatePicker, Button, Tag, Alert, Tooltip, Modal } from "antd";
import { SearchOutlined, UserOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { loginHistoryService } from "../api/services";
import type { ColumnType } from "antd/es/table";
import { usePageShortcuts } from "../hooks/usePageShortcuts";
import ShortcutHelp from "../components/ShortcutHelp";

const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const TYPE_COLOR: Record<string, string> = {
  LOGIN: "#059669", LOGOUT: "#dc2626", AUTO_LOGOUT: "#d97706",
};

export default function LoginHistory() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateRange, setDateRange] = useState<[any, any]>([null, null]);
  const [mapItem, setMapItem] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const listQuery = useQuery({
    queryKey: ["login-history", page, keyword, dateRange[0], dateRange[1]],
    queryFn: () => loginHistoryService.getAll({
      limit,
      offset: (page - 1) * limit,
      keyword: keyword || undefined,
      fromDate: dateRange[0]?.format("YYYY-MM-DD"),
      toDate: dateRange[1]?.format("YYYY-MM-DD"),
    }).then((r) => r.data),
    staleTime: 30_000,
  });

  const items: any[] = listQuery.data?.result || [];
  const total: number = listQuery.data?.total || 0;

  const { searchRef, rowClassName, onRow, searchInputProps } = usePageShortcuts({
    onNew: () => {},
    isModalOpen: !!mapItem,
    onCloseModal: () => setMapItem(null),
    onEdit: (r) => setMapItem(r),
    items,
    isFetching: listQuery.isFetching,
  });

  const columns: ColumnType<any>[] = [
    {
      title: "Account", key: "account",
      render: (_: any, r: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserOutlined style={{ color: "#2563eb", fontSize: 13 }} />
          </div>
          <span style={{ fontSize: 13, color: "#374151" }}>{r.account?.email || "—"}</span>
        </div>
      ),
    },
    {
      title: "Type", dataIndex: "type", key: "type", align: "center" as const, width: 110,
      render: (v: string) => (
        <Tag style={{ background: TYPE_COLOR[v] || "#6b7280", color: "#fff", border: "none", fontSize: 11 }}>
          {v?.replace(/_/g, " ") || "—"}
        </Tag>
      ),
    },
    { title: "IP Address", dataIndex: "ip", key: "ip", width: 130,
      render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v || "—"}</span> },
    { title: "Device", dataIndex: "deviceInfo", key: "deviceInfo",
      render: (v: string) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v || "—"}</span> },
    { title: "Duration", dataIndex: "duration", key: "duration", align: "center" as const, width: 100,
      render: (v: number) => v ? `${Math.round(v / 60)}m` : "—" },
    {
      title: "Location", key: "location", align: "center" as const, width: 90,
      render: (_: any, r: any) => r.lat && r.lng ? (
        <Tooltip title={`${r.lat}, ${r.lng}`}>
          <Button size="small" icon={<EnvironmentOutlined />} style={{ color: "#2563eb", borderColor: "#2563eb" }}
            onClick={() => setMapItem(r)} />
        </Tooltip>
      ) : <span style={{ color: "#d1d5db" }}>—</span>,
    },
    { title: "Login ID", dataIndex: "loginId", key: "loginId", width: 100,
      render: (v: string) => <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{v?.slice(0, 8) || "—"}</span> },
    { title: "Date & Time", dataIndex: "createdAt", key: "createdAt", width: 160, render: fmtDate },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Login History</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Track all staff login and logout activity</div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#fff", padding: 14, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          placeholder="Search email or IP…"
          value={searchInput}
          ref={searchRef}
          onChange={(e) => {
            setSearchInput(e.target.value);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => { setKeyword(e.target.value); setPage(1); }, 500);
          }}
          allowClear onClear={() => { setKeyword(""); setPage(1); }}
          style={{ width: 260 }}
          {...searchInputProps}
        />
        <DatePicker.RangePicker
          value={dateRange[0] && dateRange[1] ? dateRange : null}
          onChange={(v) => { setDateRange(v ? [v[0], v[1]] : [null, null]); setPage(1); }}
          format="YYYY-MM-DD"
          placeholder={["From Date", "To Date"]}
        />
        {(keyword || dateRange[0]) && (
          <Button onClick={() => { setSearchInput(""); setKeyword(""); setDateRange([null, null]); setPage(1); }}>Clear</Button>
        )}
      </div>

      {listQuery.isError && <Alert type="error" message="Failed to load login history." style={{ marginBottom: 12 }} />}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <Table
          columns={columns} dataSource={items} rowKey="id"
          loading={listQuery.isFetching} size="middle" scroll={{ x: "max-content" }}
          pagination={{ current: page, pageSize: limit, total, onChange: setPage, showSizeChanger: false, showTotal: (t) => `Total ${t}` }}
          rowClassName={rowClassName} onRow={onRow}
        />
      </div>

      {/* Location Modal */}
      <Modal
        open={!!mapItem}
        title="Login Location"
        footer={<Button onClick={() => setMapItem(null)}>Close</Button>}
        onCancel={() => setMapItem(null)}
      >
        {mapItem && (
          <div>
            <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Account", mapItem.account?.email],
                ["IP", mapItem.ip],
                ["Latitude", mapItem.lat],
                ["Longitude", mapItem.lng],
                ["Device", mapItem.deviceInfo],
                ["Date", fmtDate(mapItem.createdAt)],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{val as string || "—"}</span>
                </div>
              ))}
            </div>
            <a
              href={`https://www.google.com/maps?q=${mapItem.lat},${mapItem.lng}`}
              target="_blank" rel="noreferrer"
              style={{ display: "block", textAlign: "center", padding: "10px", background: "#2563eb", color: "#fff", borderRadius: 8, fontWeight: 600 }}
            >
              Open in Google Maps
            </a>
          </div>
        )}
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "↑ / ↓",  label: "Navigate rows" },
        { key: "E",      label: "View location" },
        { key: "Alt+S",  label: "Focus search" },
        { key: "Esc",    label: "Close modal / clear" },
      ]} />
    </div>
  );
}
