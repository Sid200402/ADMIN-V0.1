import { useState, useEffect, useRef } from "react";
import { Button, Upload, message, Alert, Modal } from "antd";
import {
  DownloadOutlined, SyncOutlined, UploadOutlined,
  CheckCircleOutlined, WarningOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { backupService } from "../api/services";
import ShortcutHelp from "../components/ShortcutHelp";

const KBD_BLUE  = { background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6 } as const;
const KBD_LIGHT = { background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 6, color: "#64748b" } as const;

export default function BackupRestore() {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable ||
        document.body.classList.contains("sidebar-focused");

      if (e.altKey) {
        if (e.key === "d" || e.key === "D") { e.preventDefault(); backupMutation.mutate(); return; }
        if (e.key === "s" || e.key === "S") { e.preventDefault(); syncMutation.mutate(); return; }
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          document.querySelector<HTMLInputElement>(".backup-upload-input input[type=file]")?.click();
          return;
        }
      }

      if (isInput) return;

      if (confirmRestore) {
        if (e.key === "Enter") { e.preventDefault(); if (restoreFile) restoreMutation.mutate(restoreFile); }
        if (e.key === "Escape") { e.preventDefault(); setConfirmRestore(false); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [confirmRestore, restoreFile]);

  const backupMutation = useMutation({
    mutationFn: () => backupService.createBackup(),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Backup downloaded successfully");
    },
    onError: () => message.error("Backup failed"),
  });

  const syncMutation = useMutation({
    mutationFn: () => backupService.syncNow(),
    onSuccess: () => message.success("Sync to backup database completed"),
    onError: () => message.error("Sync failed"),
  });

  const restoreMutation = useMutation({
    mutationFn: (file: File) => backupService.restore(file),
    onSuccess: (res) => {
      message.success(res.data?.message || "Restore completed successfully");
      setRestoreFile(null);
      setConfirmRestore(false);
    },
    onError: () => message.error("Restore failed"),
  });

  const cards = [
    {
      icon: <DownloadOutlined style={{ fontSize: 28, color: "#2563eb" }} />,
      title: "Download Backup",
      desc: "Generate and download a full SQL dump of the main database.",
      color: "#dbeafe",
      border: "#2563eb",
      action: (
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={backupMutation.isPending}
          onClick={() => backupMutation.mutate()}
          style={{ background: "#2563eb", width: "100%" }}
          size="large"
        >
          Download SQL Backup <kbd style={KBD_BLUE}>Alt+D</kbd>
        </Button>
      ),
    },
    {
      icon: <SyncOutlined style={{ fontSize: 28, color: "#059669" }} />,
      title: "Sync to Backup DB",
      desc: "Manually sync all data from the main database to the backup database (rkworld_backup).",
      color: "#dcfce7",
      border: "#059669",
      action: (
        <Button
          icon={<SyncOutlined spin={syncMutation.isPending} />}
          loading={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
          style={{ color: "#059669", borderColor: "#059669", width: "100%" }}
          size="large"
        >
          Sync Now <kbd style={KBD_LIGHT}>Alt+S</kbd>
        </Button>
      ),
    },
    {
      icon: <UploadOutlined style={{ fontSize: 28, color: "#d97706" }} />,
      title: "Restore Backup",
      desc: "Upload a .sql backup file to restore into the backup database. The main database is never modified.",
      color: "#fef3c7",
      border: "#d97706",
      action: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Upload
            className="backup-upload-input"
            accept=".sql"
            beforeUpload={(file) => { setRestoreFile(file); return false; }}
            showUploadList={restoreFile ? { showRemoveIcon: true } : false}
            onRemove={() => setRestoreFile(null)}
            maxCount={1}
            fileList={restoreFile ? [{ uid: "1", name: restoreFile.name, status: "done" } as any] : []}
          >
            <Button icon={<UploadOutlined />} style={{ width: "100%" }} size="large">
              Select .sql File <kbd style={KBD_LIGHT}>Alt+R</kbd>
            </Button>
          </Upload>
          {restoreFile && (
            <Button
              danger
              icon={<WarningOutlined />}
              size="large"
              style={{ width: "100%" }}
              onClick={() => setConfirmRestore(true)}
            >
              Restore "{restoreFile.name}"
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Backup & Restore</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Manage database backups and restoration</div>
      </div>

      <Alert
        type="info"
        showIcon
        message="Restore only affects the backup database (rkworld_backup). The main database is never modified."
        style={{ marginBottom: 24, borderRadius: 10 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {cards.map((card) => (
          <div key={card.title} style={{
            background: "#fff", borderRadius: 14,
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
            borderTop: `4px solid ${card.border}`,
            padding: 24,
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{card.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{card.desc}</div>
              </div>
            </div>
            {card.action}
          </div>
        ))}
      </div>

      {/* Auto-backup info */}
      <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <CheckCircleOutlined style={{ color: "#059669", fontSize: 18 }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Automatic Nightly Backup</span>
        </div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          The system automatically syncs to the backup database every night at <strong>2:00 AM</strong>.
          No manual action is required for routine backups.
        </div>
      </div>

      {/* Confirm Restore Modal */}
      <Modal
        open={confirmRestore}
        title={<span style={{ color: "#dc2626" }}><WarningOutlined /> Confirm Restore</span>}
        onCancel={() => setConfirmRestore(false)}
        onOk={() => restoreFile && restoreMutation.mutate(restoreFile)}
        okButtonProps={{ danger: true, loading: restoreMutation.isPending }}
        okText={<>Yes, Restore <kbd style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 4 }}>Enter</kbd></>}
        cancelText={<>Cancel <kbd style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 4, padding: "0 5px", fontSize: 10, fontFamily: "monospace", marginLeft: 4, color: "#64748b" }}>Esc</kbd></>}
      >
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
          You are about to restore <strong>"{restoreFile?.name}"</strong> into the backup database.<br />
          <span style={{ color: "#059669", fontWeight: 600 }}>The main database will NOT be affected.</span><br />
          This action will overwrite all data in the backup database. Are you sure?
        </div>
      </Modal>

      <ShortcutHelp shortcuts={[
        { key: "Alt+D", label: "Download SQL Backup" },
        { key: "Alt+S", label: "Sync to Backup DB" },
        { key: "Alt+R", label: "Select restore file" },
        { key: "Enter", label: "Confirm restore (in dialog)" },
        { key: "Esc",   label: "Cancel restore dialog" },
      ]} />
    </div>
  );
}
