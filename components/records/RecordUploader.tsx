"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, File, FileImage, FileText, FolderOpen, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useT } from "@/components/a11y/useT";
import {
  listHealthDocuments,
  saveHealthDocuments,
  type StoredHealthDocument,
} from "@/lib/records/documentStore";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<File[]>([]);
  const [stored, setStored] = useState<StoredHealthDocument[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setStored(await listHealthDocuments());
    } catch {
      setError(t("records.saveFailed"));
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stageFiles = (incoming: FileList | File[]) => {
    setMessage("");
    setError("");
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
    if (!staged.length) return;
    setSaving(true);
    setMessage("");
    setError("");
    const count = staged.length;
    try {
      await saveHealthDocuments(staged);
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

  const openRecord = (record: StoredHealthDocument) => {
    const url = URL.createObjectURL(record.file);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

      <div
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
        <button type="button" className="btn btn-md btn-secondary" onClick={() => inputRef.current?.click()}>
          <FolderOpen aria-hidden />
          {t("records.chooseFiles")}
        </button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple
          accept=".pdf,image/*,.xml,.json"
          onChange={(event) => event.target.files && stageFiles(event.target.files)}
        />
      </div>

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
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => openRecord(record)}>
                  {t("records.open")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
