"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, File, FileImage, FileText, FolderOpen, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useT } from "@/components/a11y/useT";
import {
  encodeDocument,
  type StoredHealthDocument,
} from "@/lib/records/documentStore";

import { useProfile } from "@/components/profile/ProfileProvider";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "heic", "heif", "xml", "json"];

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function RecordIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <FileImage aria-hidden />;
  if (type === "application/pdf") return <FileText aria-hidden />;
  return <File aria-hidden />;
}

export function RecordUploader() {
  const { t, lang } = useT();
  const { profile, context, request } = useProfile();
  const uploadIds = useRef(new WeakMap<File, string>());
  const lifecycle = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<File[]>([]);
  const [stored, setStored] = useState<StoredHealthDocument[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await request<{ documents: StoredHealthDocument[] }>("documents", { expectedContext: context, signal: lifecycle.current?.signal });
      setStored(result.documents);
    } catch {
      setError(t("records.saveFailed"));
    }
  }, [context, request, t]);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    void refresh();
    return () => controller.abort();
  }, [refresh]);

  const stageFiles = (incoming: FileList | File[]) => {
    setMessage("");
    setError("");
    if (saving || profile.synthetic) return;
    const valid: File[] = [];
    for (const file of Array.from(incoming)) {
      if (!ALLOWED_EXTENSIONS.includes(fileExtension(file.name))) {
        setError(`${file.name}: ${t("records.invalidType")}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: ${t("records.tooLarge")}`);
        continue;
      }
      valid.push(file);
    }
    setStaged((current) => [...current, ...valid]);
  };

  const confirmSave = async () => {
    if (!staged.length || saving || profile.synthetic) return;
    if (staged.length > 20 || staged.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024) {
      setError(lang === "es" ? "Añade hasta 20 archivos y 30 MB en total por lote." : "Add up to 20 files and 30 MB total per batch.");
      return;
    }
    const signal = lifecycle.current?.signal;
    setSaving(true);
    setMessage("");
    setError("");
    const count = staged.length;
    try {
      const files = await Promise.all(staged.map(async file => {
        let id = uploadIds.current.get(file);
        if (!id) { id = crypto.randomUUID(); uploadIds.current.set(file, id); }
        return { id, name: file.name, data: await encodeDocument(file) };
      }));
      await request("documents", { method: "POST", body: { confirmed: true, files }, expectedContext: context, signal });
      setStaged([]);
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
      setMessage(t(count === 1 ? "records.savedOne" : "records.savedMany", { count }));
    } catch {
      setError(t("records.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openRecord = async (record: StoredHealthDocument) => {
    try {
      const result = await request<{ data: string }>(`documents/file?id=${encodeURIComponent(record.id)}`, { expectedContext: context, signal: lifecycle.current?.signal });
      const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
      // Download as an attachment; never execute an uploaded document as app HTML.
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
      const link = document.createElement("a");
      link.href = url; link.download = record.name; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(t("records.saveFailed")); }
  };

  return (
    <section className="records-card" aria-labelledby="upload-records-heading">
      <div className="records-section-heading">
        <span className="records-heading-icon"><UploadCloud aria-hidden /></span>
        <div>
          <h2 id="upload-records-heading">{t("records.uploadHeading")}</h2>
          <p>{t("records.uploadBody")}</p>
        </div>
      </div>

      {profile.synthetic ? <p className="records-empty">Record upload is disabled in this synthetic demo. No real medical files are collected.</p> : <div
        className={`record-upload-zone${dragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          stageFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud aria-hidden />
        <strong>{t("records.dropTitle")}</strong>
        <span>{t("records.dropHint")}</span>
        <button type="button" className="btn btn-md btn-secondary" disabled={saving} onClick={() => inputRef.current?.click()}>
          <FolderOpen aria-hidden />
          {t("records.chooseFiles")}
        </button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple
          disabled={saving}
          accept=".pdf,image/*,.xml,.json"
          onChange={(event) => event.target.files && stageFiles(event.target.files)}
        />
      </div>}

      {staged.length > 0 && (
        <div className="staged-records fade-up">
          <h3>{t("records.stagedHeading")}</h3>
          <ul>
            {staged.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}>
                <span className="record-file-icon"><RecordIcon type={file.type} /></span>
                <span><strong>{file.name}</strong><small>{formatSize(file.size)}</small></span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={saving}
                  onClick={() => setStaged((files) => files.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={`${t("records.remove")} ${file.name}`}
                >
                  <X aria-hidden />
                  {t("records.remove")}
                </button>
              </li>
            ))}
          </ul>
          <div className="record-confirm-row">
            <p><ShieldCheck aria-hidden />{t("records.documentSafetyBody")}</p>
            <button type="button" className="btn btn-md btn-primary" disabled={saving} onClick={() => void confirmSave()}>
              {saving ? t("records.saving") : t(staged.length === 1 ? "records.confirmOne" : "records.confirmMany", { count: staged.length })}
            </button>
          </div>
        </div>
      )}

      {(message || error) && (
        <p className={error ? "record-status is-error" : "record-status"} role="status">
          {!error && <CheckCircle2 aria-hidden />}{error || message}
        </p>
      )}

      <div className="saved-records">
        <div>
          <h3>{t("records.existingHeading")}</h3>
          <p>{t("records.existingBody")}</p>
          <p className="mt-2 text-xs text-muted">{lang === "es" ? "Los archivos anteriores guardados sin perfil permanecen en el navegador; no se asignan automáticamente." : "Older browser files saved without a profile remain untouched and are not automatically assigned."}</p>
        </div>
        {stored.length === 0 ? (
          <p className="records-empty">{t("records.noRecords")}</p>
        ) : (
          <ul>
            {stored.map((record) => (
              <li key={record.id}>
                <span className="record-file-icon"><RecordIcon type={record.type} /></span>
                <span>
                  <strong>{record.name}</strong>
                  <small>{formatSize(record.size)} · {new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(record.addedAt))}</small>
                  <em>{t("records.storedLocally")}</em>
                </span>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => void openRecord(record)}>
                  {lang === "es" ? "Descargar" : "Download"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
