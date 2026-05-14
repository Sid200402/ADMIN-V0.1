import { useState } from "react";
import { KeyOutlined, CloseOutlined } from "@ant-design/icons";

interface ShortcutItem { key: string; label: string; }
interface Props { shortcuts?: ShortcutItem[]; }

function Kbd({ k }: { k: string }) {
  return (
    <kbd style={{
      background: "#1e293b", border: "1px solid #334155", borderRadius: 4,
      padding: "1px 6px", fontSize: 11, fontFamily: "monospace", color: "#e2e8f0",
      whiteSpace: "nowrap",
    }}>{k}</kbd>
  );
}

function Row({ label, k }: { label: string; k: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
      <Kbd k={k} />
    </div>
  );
}

const NAV_SHORTCUTS: ShortcutItem[] = [
  { key: "Alt+M", label: "Focus Sidebar Menu" },
  { key: "Alt+1", label: "Dashboard" },
  { key: "Alt+2", label: "Bills" },
  { key: "Alt+3", label: "Cash Management" },
  { key: "Alt+4", label: "Store" },
  { key: "Alt+5", label: "Master Brands" },
  { key: "Alt+6", label: "Brands" },
  { key: "Alt+7", label: "Category" },
  { key: "Alt+8", label: "Model" },
  { key: "Alt+9", label: "Unit" },
  { key: "Alt+0", label: "Tax Rates" },
  { key: "Alt+B", label: "Toggle Sidebar" },
];

export default function ShortcutHelp({ shortcuts = [] }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
      {open && (
        <div style={{
          marginBottom: 10, background: "#0f172a", borderRadius: 12,
          padding: "14px 16px", width: 280, color: "#e2e8f0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          {shortcuts.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                This Page
              </div>
              {shortcuts.map(s => <Row key={s.key} label={s.label} k={s.key} />)}
              <div style={{ height: 1, background: "#1e293b", margin: "10px 0" }} />
            </>
          )}

          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Navigate Pages
          </div>
          {NAV_SHORTCUTS.map(s => <Row key={s.key} label={s.label} k={s.key} />)}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        title="Keyboard shortcuts"
        style={{
          width: 42, height: 42, borderRadius: "50%",
          background: open ? "#2563eb" : "#0f172a",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          transition: "background 0.2s",
        }}
      >
        {open
          ? <CloseOutlined style={{ color: "#fff", fontSize: 16 }} />
          : <KeyOutlined style={{ color: "#fff", fontSize: 18 }} />
        }
      </button>
    </div>
  );
}
