import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import type { FileItem } from "../lib/types";

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "warn"; children: ReactNode }) {
  return (
    <div className={`alert alert--${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page__head">
      <div>
        {eyebrow && <div className="eyebrow eyebrow--brass">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

// A label wired to its control. The control is rendered by the caller, so it works for inputs, selects and textareas.
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export function CheckGroup({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string[]; onChange: (next: string[]) => void }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend className="label" style={{ marginBottom: 6 }}>{label}</legend>
      <div className="checks">
        {options.map((option) => (
          <label key={option.value} className="check">
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(event) => onChange(event.target.checked ? [...value, option.value] : value.filter((item) => item !== option.value))}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const STATUS: Record<string, { label?: string; kind: "pending" | "ok" | "bad" | "brand" | "muted" }> = {
  Pending: { kind: "pending" },
  Approved: { kind: "ok" },
  Rejected: { kind: "bad" },
  Listed: { kind: "ok" },
  Hidden: { kind: "muted" },
  Draft: { kind: "muted" },
  Archived: { kind: "bad" },
  Vacant: { kind: "ok" },
  Occupied: { kind: "brand" },
  UnderMaintenance: { label: "Under maintenance", kind: "pending" },
  Active: { kind: "ok" },
  Ended: { kind: "muted" },
  Cancelled: { kind: "muted" },
  Suspended: { kind: "pending" },
  Deactivated: { kind: "bad" },
  Queued: { kind: "pending" },
  Sent: { kind: "ok" },
  Failed: { kind: "bad" },
};

export function StatusTag({ value, label }: { value: string; label?: string }) {
  const entry = STATUS[value] ?? { kind: "muted" as const };
  return <span className={`tag${entry.kind === "muted" ? "" : ` tag--${entry.kind}`}`}>{label ?? entry.label ?? value}</span>;
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return total > 0 ? <div className="pager muted small">{total} in total</div> : null;
  return (
    <nav className="pager" aria-label="Pagination">
      <span className="muted small">
        Page {page} of {totalPages} · {total} in total
      </span>
      <span className="row">
        <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </span>
    </nav>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-back" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={ref} className={`modal${wide ? " modal--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="row row--between" style={{ marginBottom: 16 }}>
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="link" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirm", danger, busy, onConfirm, onClose }: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="stack">
        <div>{message}</div>
        <div className="row row--end">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`btn${danger ? " btn--danger" : ""}`} disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Photo({ file, alt, thumb }: { file: FileItem | null | undefined; alt: string; thumb?: boolean }) {
  const src = file ? (thumb ? file.thumbUrl ?? file.url : file.url) : null;
  if (!src) return <div className="photo-fallback">No photo</div>;
  return <img src={src} alt={alt} loading="lazy" />;
}

export function FileDrop({ accept, multiple, busy, label, onFiles }: { accept: string; multiple?: boolean; busy?: boolean; label: string; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = (list: FileList | null) => {
    if (list && list.length > 0) onFiles(Array.from(list));
    if (input.current) input.current.value = "";
  };

  return (
    <div
      className={`drop${over ? " over" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => !busy && input.current?.click()}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && !busy && input.current?.click()}
      onDragOver={(event: DragEvent) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        setOver(false);
        if (!busy) handle(event.dataTransfer.files);
      }}
    >
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(event: ChangeEvent<HTMLInputElement>) => handle(event.target.files)} />
      {busy ? "Uploading…" : label}
    </div>
  );
}

export function Lightbox({ images, index, onClose }: { images: FileItem[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setCurrent((value) => (value + 1) % images.length);
      if (event.key === "ArrowLeft") setCurrent((value) => (value + images.length - 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  const file = images[current];
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <button type="button" className="btn btn--sm" onClick={onClose}>
        Close
      </button>
      {file?.url && <img src={file.url} alt={`Photo ${current + 1} of ${images.length}`} onClick={(event) => event.stopPropagation()} />}
    </div>
  );
}

export function DescriptionList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([term, detail]) => (
        <div key={term} style={{ display: "contents" }}>
          <dt>{term}</dt>
          <dd>{detail ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
