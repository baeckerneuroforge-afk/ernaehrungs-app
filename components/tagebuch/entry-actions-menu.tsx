"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  /** A11y-Label für den Trigger-Button, z.B. Mahlzeit-Beschreibung. */
  label?: string;
}

/**
 * 3-Punkte-Dropdown für Tagebuch-Einträge (Bearbeiten + Löschen).
 * Trigger ist 44×44 (WCAG Touch-Target). Schließt bei Click außerhalb,
 * ESC, oder Auswahl. Bewusst kein Headless-UI/Radix — minimaler Footprint,
 * das Menü hat nur zwei Items und Click-outside ist trivial.
 */
export function EntryActionsMenu({ onEdit, onDelete, label }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // pointerdown statt click: schließt auch wenn der Click auf einem
    // disabled-Element o.ä. landet, wo "click" nicht feuert.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center text-ink-faint hover:text-ink transition rounded-full"
        aria-label={label ? `Aktionen für ${label}` : "Aktionen"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-30 min-w-[160px] bg-white border border-border rounded-2xl shadow-pop overflow-hidden animate-fade-in"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-3 px-4 h-11 text-sm text-ink hover:bg-surface-muted transition text-left"
          >
            <Pencil className="w-4 h-4 text-ink-muted" />
            Bearbeiten
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-3 px-4 h-11 text-sm text-red-600 hover:bg-red-50 transition text-left border-t border-border"
          >
            <Trash2 className="w-4 h-4" />
            Löschen
          </button>
        </div>
      )}
    </div>
  );
}
