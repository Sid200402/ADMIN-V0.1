import { useEffect, useRef, useCallback, useState } from "react";

export function usePageShortcuts(opts: {
  onNew: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  onEdit?: (row: any) => void;
  items?: any[];
  isFetching?: boolean;
}) {
  const searchRef  = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [focusedId, setFocusedIdRaw] = useState<string | null>(null);
  const [pendingFocusFirst, setPendingFocusFirst] = useState(false);

  const items      = opts.items      ?? [];
  const isFetching = opts.isFetching ?? false;

  const setFocusedId = useCallback((id: string | null) => {
    setFocusedIdRaw(id);
  }, []);

  const focusedIdx = focusedId ? items.findIndex((r: any) => r.id === focusedId) : -1;

  // auto-focus first row after search Enter
  useEffect(() => {
    if (pendingFocusFirst && !isFetching && items.length > 0) {
      setFocusedIdRaw(items[0].id);
      setPendingFocusFirst(false);
    }
  }, [pendingFocusFirst, isFetching, items]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

      // Alt shortcuts — always active
      if (e.altKey) {
        if (e.key === "s" || e.key === "S") { e.preventDefault(); searchRef.current?.focus(); return; }
        if ((e.key === "n" || e.key === "N") && !isInput) { e.preventDefault(); opts.onNew(); return; }
        if (e.key === "f" || e.key === "F") { e.preventDefault(); searchRef.current?.focus(); return; }
        return;
      }

      if (isInput) return;

      // Escape closes modal or clears selection
      if (e.key === "Escape") {
        if (opts.isModalOpen) { opts.onCloseModal(); return; }
        setFocusedIdRaw(null); return;
      }

      if (opts.isModalOpen) return;

      // Arrow navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = focusedIdx < 0 ? 0 : Math.min(focusedIdx + 1, items.length - 1);
        setFocusedIdRaw(items[next]?.id ?? null); return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = focusedIdx < 0 ? 0 : Math.max(focusedIdx - 1, 0);
        setFocusedIdRaw(items[prev]?.id ?? null); return;
      }

      // Enter / Space — focus first row if none selected
      if ((e.key === "Enter" || e.key === " ") && focusedIdx < 0 && items.length > 0) {
        e.preventDefault(); setFocusedIdRaw(items[0].id); return;
      }

      // Row shortcuts
      const row = focusedIdx >= 0 ? items[focusedIdx] : null;
      if (!row) return;
      if ((e.key === "e" || e.key === "E") && opts.onEdit) { e.preventDefault(); opts.onEdit(row); }
    };

    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [opts.isModalOpen, opts.onNew, opts.onCloseModal, opts.onEdit, focusedIdx, items]);

  const rowClassName = useCallback(
    (record: any) => (record.id === focusedId ? "page-row-focused" : ""),
    [focusedId]
  );

  // inject green border CSS once
  useEffect(() => {
    const id = "page-row-focused-style";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      .page-row-focused td { background: #f0fdf4 !important; box-shadow: inset 0 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
      .page-row-focused td:first-child { box-shadow: inset 2px 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
      .page-row-focused td:last-child  { box-shadow: inset -2px 2px 0 #16a34a, inset 0 -2px 0 #16a34a; }
    `;
    document.head.appendChild(s);
  }, []);

  const onRow = useCallback(
    (record: any) => ({ onClick: () => setFocusedIdRaw(record.id) }),
    []
  );

  const searchInputProps = {
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(debounceRef.current);
        searchRef.current?.blur();
        setPendingFocusFirst(true);
      }
      if (e.key === "Escape") {
        (e.target as HTMLInputElement).value = "";
        searchRef.current?.blur();
      }
    },
  };

  return { searchRef, debounceRef, focusedId, setFocusedId, rowClassName, onRow, searchInputProps };
}
