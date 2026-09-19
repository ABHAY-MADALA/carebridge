"use client";
import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useT } from "@/components/a11y/useT";

export function EntryActions({ label, time, onRemove }: { label: string; time: string; onRemove: () => void | Promise<void> }) {
  const { lang } = useT();
  const es = lang === "es";
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!busy && !ref.current?.contains(e.target as Node)) { setOpen(false); setConfirm(false); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, busy]);
  useEffect(() => { if (confirm) cancel.current?.focus(); }, [confirm]);
  return <div ref={ref} className="relative shrink-0" onKeyDown={e => { if (e.key === "Escape" && !busy) { setOpen(false); setConfirm(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" className="btn btn-sm btn-ghost min-w-[44px]" aria-label={es ? `Acciones para ${label}, registrado a las ${time}` : `Actions for ${label} recorded at ${time}`} aria-expanded={open} aria-controls={id} onClick={() => { setOpen(!open); setConfirm(false); setError(false); }}><MoreHorizontal size={20} aria-hidden /></button>
    {open && <div id={id} className="card absolute right-0 top-full z-20 w-[min(18rem,80vw)] p-3 shadow-lg">
      {!confirm ? <button autoFocus type="button" className="btn btn-sm btn-ghost w-full justify-start" onClick={() => setConfirm(true)}><Trash2 size={16} aria-hidden />{es ? "Eliminar" : "Remove"}</button> : <>
        <p className="text-sm font-medium">{es ? `¿Eliminar “${label}”?` : `Remove “${label}”?`}</p>
        <p className="my-2 text-sm text-muted">{es ? "Se eliminará de tu cronología. No se puede deshacer." : "This will permanently remove this entry from your timeline."}</p>
        <div className="flex flex-wrap gap-2">
          <button ref={cancel} type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => { setOpen(false); setConfirm(false); trigger.current?.focus(); }}>{es ? "Conservar" : "Keep entry"}</button>
          <button type="button" className="btn btn-sm btn-ghost text-danger" disabled={busy} onClick={async () => { setBusy(true); try { await onRemove(); setOpen(false); } catch { setError(true); } finally { setBusy(false); } }}>{busy ? (es ? "Eliminando…" : "Removing…") : (es ? "Sí, eliminar" : "Yes, remove")}</button>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{es ? "No se pudo eliminar. Inténtalo de nuevo." : "Could not remove the entry. Please try again."}</p>}
      </>}
    </div>}
  </div>;
}
