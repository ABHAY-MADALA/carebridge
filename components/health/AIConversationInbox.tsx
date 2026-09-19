"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  FileUp,
  Loader2,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useProfile } from "@/components/profile/ProfileProvider";
import { useHealthData } from "@/components/health/useHealthData";
import { useT } from "@/components/a11y/useT";
import {
  AI_PROVIDER_LABELS,
  inferAIProvider,
  parseAIArchive,
  type ParsedAIArchive,
} from "@/lib/ai/importArchive";
import type {
  AIImportCandidate,
  AIProvider,
} from "@/lib/backend/client";

const MAX_ARCHIVE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["json", "html", "htm", "txt"];

const copy = {
  en: {
    heading: "AI conversation inbox",
    introPersonal: "Bring in health details you already shared with an AI. HealthThread checks your messages locally and keeps possible updates here for you to review.",
    introDemo: "Alex uses fictional conversations so you can demonstrate the review flow without connecting a real account.",
    privacy: "AI replies are never treated as patient facts. Nothing enters My Health until you approve it.",
    liveTitle: "Continuous connections",
    liveBody: "The secure live ChatGPT and Claude connector needs real sign-in and a hosted production service. This local build does not pretend those accounts are connected.",
    importTitle: "Import a conversation export",
    importHint: "Choose a JSON, HTML, or text export. The file is read on this computer and only possible health messages are staged.",
    choose: "Choose conversation file",
    provider: "Export source",
    found: "possible health updates found",
    scanned: "messages checked",
    noMatches: "No possible health messages were found. Nothing was added.",
    invalid: "Choose a valid JSON, HTML, or TXT conversation export under 8 MB.",
    addReview: "Add to private review inbox",
    adding: "Adding to review…",
    duplicate: "Already reviewed or already in this inbox",
    inboxTitle: "Waiting for your review",
    inboxEmpty: "There are no conversation updates waiting for review.",
    emptyHelp: "Choose an export above when you are ready. HealthThread will show possible updates here before anything can be saved.",
    reported: "Shared with",
    noDate: "Conversation date not included",
    select: "Select this update",
    all: "Select all",
    review: "Review selected",
    ignore: "Ignore",
    reviewTitle: "Check before saving",
    reviewBody: "These are the exact messages and proposed details that will be added. Missing details stay unrecorded.",
    back: "Back to inbox",
    confirm: "Yes, save to My Health",
    saving: "Saving…",
    notSaved: "Not saved to My Health yet",
    saved: "Saved to My Health after your confirmation.",
    restore: "Restore demo inbox",
    restoring: "Restoring…",
    demoBadge: "Demo · Fictional conversations",
    importReady: "Archive import ready",
    demoReady: "Demo source",
    loadError: "The conversation inbox could not be loaded.",
    actionError: "That change could not be completed. Please try again.",
  },
  es: {
    heading: "Bandeja de conversaciones con IA",
    introPersonal: "Trae información de salud que ya compartiste con una IA. HealthThread revisa tus mensajes localmente y guarda posibles actualizaciones aquí para que las revises.",
    introDemo: "Alex usa conversaciones ficticias para demostrar la revisión sin conectar una cuenta real.",
    privacy: "Las respuestas de la IA nunca se tratan como hechos del paciente. Nada entra en Mi salud hasta que lo apruebes.",
    liveTitle: "Conexiones continuas",
    liveBody: "El conector seguro en vivo para ChatGPT y Claude necesita inicio de sesión real y un servicio de producción alojado. Esta versión local no finge que esas cuentas están conectadas.",
    importTitle: "Importar una conversación",
    importHint: "Elige una exportación JSON, HTML o de texto. El archivo se lee en esta computadora y solo se preparan posibles mensajes de salud.",
    choose: "Elegir archivo de conversación",
    provider: "Origen de la exportación",
    found: "posibles actualizaciones encontradas",
    scanned: "mensajes revisados",
    noMatches: "No se encontraron posibles mensajes de salud. No se añadió nada.",
    invalid: "Elige una exportación JSON, HTML o TXT válida de menos de 8 MB.",
    addReview: "Añadir a la bandeja privada",
    adding: "Añadiendo…",
    duplicate: "Ya revisado o ya está en esta bandeja",
    inboxTitle: "Esperando tu revisión",
    inboxEmpty: "No hay actualizaciones esperando revisión.",
    emptyHelp: "Elige una exportación arriba cuando quieras. HealthThread mostrará aquí las posibles actualizaciones antes de que se pueda guardar algo.",
    reported: "Compartido con",
    noDate: "La fecha de la conversación no está incluida",
    select: "Seleccionar esta actualización",
    all: "Seleccionar todo",
    review: "Revisar seleccionados",
    ignore: "Ignorar",
    reviewTitle: "Comprueba antes de guardar",
    reviewBody: "Estos son los mensajes exactos y los detalles propuestos que se añadirán. Los detalles que faltan quedan sin registrar.",
    back: "Volver a la bandeja",
    confirm: "Sí, guardar en Mi salud",
    saving: "Guardando…",
    notSaved: "Aún no se guardó en Mi salud",
    saved: "Guardado en Mi salud después de tu confirmación.",
    restore: "Restaurar bandeja de demostración",
    restoring: "Restaurando…",
    demoBadge: "Demo · Conversaciones ficticias",
    importReady: "Importación disponible",
    demoReady: "Fuente de demostración",
    loadError: "No se pudo cargar la bandeja de conversaciones.",
    actionError: "No se pudo completar el cambio. Inténtalo de nuevo.",
  },
} as const;

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function providerMark(provider: AIProvider) {
  if (provider === "chatgpt") return "C";
  if (provider === "claude") return "A";
  if (provider === "gemini") return "G";
  return "AI";
}

export function AIConversationInbox() {
  const { lang } = useT();
  const text = copy[lang];
  const { profile, context, request } = useProfile();
  const { refresh: refreshHealth } = useHealthData();
  const inputRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef(context);
  const [candidates, setCandidates] = useState<AIImportCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [parsed, setParsed] = useState<ParsedAIArchive | null>(null);
  const [filename, setFilename] = useState("");
  const [provider, setProvider] = useState<AIProvider>("chatgpt");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"stage" | "confirm" | "dismiss" | "reset" | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    contextRef.current = context;
    setSelected(new Set());
    setParsed(null);
    setFilename("");
    setReviewing(false);
    setMessage("");
    setError("");
  }, [context]);

  const refreshInbox = useCallback(async () => {
    const response = await request<{ candidates: AIImportCandidate[] }>("ai-inbox", {
      expectedContext: context,
    });
    setCandidates(response.candidates);
    setSelected((current) => new Set([...current].filter((id) => response.candidates.some((candidate) => candidate.id === id))));
  }, [context, request]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refreshInbox()
      .catch(() => {
        if (!cancelled) setError(text.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshInbox, text.loadError]);

  const readFile = async (file: File) => {
    setError("");
    setMessage("");
    setParsed(null);
    if (!ACCEPTED_EXTENSIONS.includes(extension(file.name)) || file.size > MAX_ARCHIVE_SIZE) {
      setError(text.invalid);
      return;
    }
    const startedIn = context;
    try {
      const source = await file.text();
      if (contextRef.current !== startedIn) return;
      const inferred = inferAIProvider(file.name);
      const selectedProvider = inferred === "other" ? provider : inferred;
      setProvider(selectedProvider);
      setFilename(file.name);
      const result = parseAIArchive(file.name, source, selectedProvider);
      setParsed(result);
      if (!result.candidates.length) setMessage(text.noMatches);
    } catch {
      setError(text.invalid);
    }
  };

  const stage = async () => {
    if (!parsed?.candidates.length || busy) return;
    setBusy("stage");
    setError("");
    setMessage("");
    try {
      const result = await request<{ added: number; skipped: number }>("ai-inbox/stage", {
        method: "POST",
        expectedContext: context,
        body: { confirmedReview: true, candidates: parsed.candidates },
      });
      await refreshInbox();
      setParsed(null);
      setFilename("");
      if (inputRef.current) inputRef.current.value = "";
      setMessage(result.added
        ? `${result.added} ${text.found}.`
        : text.duplicate);
    } catch {
      setError(text.actionError);
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async (id: string) => {
    if (busy) return;
    setBusy("dismiss");
    setError("");
    try {
      await request("ai-inbox/dismiss", {
        method: "POST",
        expectedContext: context,
        body: { confirmed: true, ids: [id] },
      });
      await refreshInbox();
    } catch {
      setError(text.actionError);
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    const ids = [...selected];
    if (!ids.length || busy) return;
    setBusy("confirm");
    setError("");
    setMessage("");
    try {
      await request("ai-inbox/confirm", {
        method: "POST",
        expectedContext: context,
        body: { confirmed: true, ids },
      });
      await Promise.all([refreshInbox(), refreshHealth()]);
      setSelected(new Set());
      setReviewing(false);
      setMessage(text.saved);
    } catch {
      setError(text.actionError);
    } finally {
      setBusy(null);
    }
  };

  const restoreDemo = async () => {
    if (busy) return;
    setBusy("reset");
    setError("");
    try {
      await request("ai-inbox/demo-reset", {
        method: "POST",
        expectedContext: context,
        body: { confirmed: true },
      });
      await refreshInbox();
      setSelected(new Set());
      setReviewing(false);
    } catch {
      setError(text.actionError);
    } finally {
      setBusy(null);
    }
  };

  const selectedCandidates = candidates.filter((candidate) => selected.has(candidate.id));
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : text.noDate;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 md:p-6" aria-labelledby="ai-conversation-inbox-heading">
      <div className="flex items-start gap-4">
        <span className="snapshot-icon shrink-0"><MessageSquareText aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ai-conversation-inbox-heading" className="text-xl font-semibold text-ink">{text.heading}</h2>
            {profile.synthetic && <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{text.demoBadge}</span>}
          </div>
          <p className="mt-1 text-sm text-muted">{profile.synthetic ? text.introDemo : text.introPersonal}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label={profile.synthetic ? text.demoBadge : text.importReady}>
        {(["chatgpt", "claude", "gemini"] as const).map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-xl border border-line bg-raised p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand" aria-hidden>{providerMark(item)}</span>
            <span className="min-w-0"><strong className="block text-sm text-ink">{AI_PROVIDER_LABELS[item]}</strong><small className="text-muted">{profile.synthetic ? text.demoReady : text.importReady}</small></span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3 rounded-xl bg-brand-soft p-4 text-sm text-ink">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <p>{text.privacy}</p>
      </div>

      {!profile.synthetic && (
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 h-5 w-5 text-brand" aria-hidden />
            <div>
              <h3 className="font-semibold text-ink">{text.importTitle}</h3>
              <p className="mt-1 text-sm text-muted">{text.importHint}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-medium text-ink">
              <span>{text.provider}</span>
              <select
                className="min-h-11 rounded-xl border border-line bg-surface px-3"
                value={provider}
                onChange={(event) => setProvider(event.target.value as AIProvider)}
                disabled={Boolean(busy)}
              >
                {Object.entries(AI_PROVIDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-md btn-secondary" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>
              <FileUp aria-hidden />{text.choose}
            </button>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".json,.html,.htm,.txt"
              disabled={Boolean(busy)}
              onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])}
            />
          </div>
          {parsed && (
            <div className="mt-4 rounded-xl border border-line bg-raised p-4 fade-up">
              <p className="font-semibold text-ink">{filename}</p>
              <p className="mt-1 text-sm text-muted">{parsed.candidates.length} {text.found} · {parsed.messagesScanned} {text.scanned}</p>
              {parsed.candidates.length > 0 && (
                <>
                  <ul className="mt-3 space-y-2">
                    {parsed.candidates.slice(0, 3).map((candidate, index) => (
                      <li key={`${candidate.originalText}-${index}`} className="rounded-lg bg-surface px-3 py-2 text-sm italic text-muted">&ldquo;{candidate.originalText}&rdquo;</li>
                    ))}
                  </ul>
                  <button type="button" className="btn btn-md btn-primary mt-4" disabled={Boolean(busy)} onClick={() => void stage()}>
                    {busy === "stage" ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                    {busy === "stage" ? text.adding : text.addReview}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">{reviewing ? text.reviewTitle : text.inboxTitle}</h3>
            <p className="mt-1 text-sm text-muted">
              {reviewing
                ? text.reviewBody
                : candidates.length
                  ? `${candidates.length} ${lang === "es" ? (candidates.length === 1 ? "actualización de conversación" : "actualizaciones de conversación") : (candidates.length === 1 ? "conversation update" : "conversation updates")} · ${text.notSaved}`
                  : text.inboxEmpty}
            </p>
          </div>
          {profile.synthetic && !reviewing && (
            <button type="button" className="btn btn-sm btn-ghost" disabled={Boolean(busy)} onClick={() => void restoreDemo()}>
              {busy === "reset" ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
              {busy === "reset" ? text.restoring : text.restore}
            </button>
          )}
        </div>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="mt-4 rounded-xl bg-raised p-4 text-sm text-muted">{text.emptyHelp}</p>
        ) : (
          <>
            {!reviewing && (
              <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={selected.size === candidates.length}
                  onChange={(event) => setSelected(event.target.checked ? new Set(candidates.map((candidate) => candidate.id)) : new Set())}
                />
                {text.all}
              </label>
            )}
            <ul className="mt-3 space-y-3">
              {(reviewing ? selectedCandidates : candidates).map((candidate) => (
                <li key={candidate.id} className="rounded-xl border border-line bg-raised p-4">
                  <div className="flex items-start gap-3">
                    {!reviewing && (
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0"
                        aria-label={text.select}
                        checked={selected.has(candidate.id)}
                        onChange={(event) => setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(candidate.id); else next.delete(candidate.id);
                          return next;
                        })}
                      />
                    )}
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand" aria-hidden>{providerMark(candidate.provider)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <strong className="text-ink">{text.reported} {AI_PROVIDER_LABELS[candidate.provider]}</strong>
                        <span>·</span><span>{formatDate(candidate.capturedAt)}</span>
                        {candidate.conversationTitle && <><span>·</span><span>{candidate.conversationTitle}</span></>}
                      </div>
                      <blockquote className="mt-2 border-l-2 border-brand pl-3 text-sm italic text-ink">&ldquo;{candidate.originalText}&rdquo;</blockquote>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {candidate.drafts.map((draft, index) => (
                          <span key={`${draft.label}-${index}`} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
                            {draft.label}{draft.bodyLocation ? ` · ${draft.bodyLocation}` : ""}{draft.severity !== null && draft.severity !== undefined ? ` · ${draft.severity}/10` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!reviewing && (
                      <button type="button" className="btn btn-sm btn-ghost shrink-0" disabled={Boolean(busy)} onClick={() => void dismiss(candidate.id)}>
                        <X aria-hidden />{text.ignore}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              {reviewing ? (
                <>
                  <button type="button" className="btn btn-md btn-primary" disabled={Boolean(busy)} onClick={() => void confirm()}>
                    {busy === "confirm" ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />}
                    {busy === "confirm" ? text.saving : text.confirm}
                  </button>
                  <button type="button" className="btn btn-md btn-secondary" disabled={Boolean(busy)} onClick={() => setReviewing(false)}>{text.back}</button>
                </>
              ) : (
                <button type="button" className="btn btn-md btn-primary" disabled={!selected.size || Boolean(busy)} onClick={() => setReviewing(true)}>
                  <Sparkles aria-hidden />{text.review} ({selected.size})
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {!profile.synthetic && (
        <details className="mt-6 border-t border-line pt-5">
          <summary className="cursor-pointer font-semibold text-ink">{text.liveTitle}</summary>
          <p className="mt-2 text-sm text-muted">{text.liveBody}</p>
        </details>
      )}

      {(message || error) && (
        <p className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${error ? "bg-warn-soft text-ink" : "bg-brand-soft text-ink"}`} role="status">
          {error ? <Bot aria-hidden /> : <CheckCircle2 aria-hidden />}{error || message}
        </p>
      )}
    </section>
  );
}
