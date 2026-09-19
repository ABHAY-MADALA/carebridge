"use client";

import { Check, Pencil } from "lucide-react";
import type { DraftEvent } from "@/lib/schema";
import { CATEGORY_EMOJI, severityFace, severityWord } from "@/lib/health/categories";

/*
  "Here's what I understood."

  Nothing is saved until the patient presses Save. This screen is the entire
  reason the assistant is trustworthy: the patient sees exactly what will be
  written down, in plain words, before it exists.
*/

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <dt className="label">{label}</dt>
      <dd className="text-base font-medium">{value}</dd>
    </div>
  );
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} minutes`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function ConfirmationCard({
  drafts,
  onSave,
  onRevise,
  saving,
}: {
  drafts: DraftEvent[];
  onSave: () => void;
  onRevise: () => void;
  saving: boolean;
}) {
  return (
    <section className="card fade-up border-2 border-brand p-5" aria-labelledby="understood">
      <h3 id="understood" className="text-xl font-bold">
        Here&apos;s what I understood
      </h3>

      <ul className="mt-4 space-y-4">
        {drafts.map((draft, i) => (
          <li key={i} className="rounded-xl bg-raised p-4">
            <p className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden>{CATEGORY_EMOJI[draft.category]}</span>
              {draft.label}
            </p>

            <dl className="mt-2 space-y-1">
              {draft.severity !== null && draft.severity !== undefined && (
                <Row
                  label="How strong"
                  value={
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="text-xl">
                        {severityFace(draft.severity)}
                      </span>
                      {draft.severity}/10
                      <span className="text-muted">({severityWord(draft.severity)})</span>
                    </span>
                  }
                />
              )}
              {draft.bodyLocation && <Row label="Where" value={draft.bodyLocation} />}
              {draft.onset && <Row label="Started" value={draft.onset} />}
              {draft.pattern && <Row label="Pattern" value={draft.pattern} />}
              {draft.durationMinutes ? (
                <Row label="How long" value={formatDuration(draft.durationMinutes)} />
              ) : null}
              {draft.trendHint && (
                <Row
                  label="Compared with before"
                  value={
                    draft.trendHint === "worse"
                      ? "Getting worse"
                      : draft.trendHint === "better"
                        ? "Getting better"
                        : "About the same"
                  }
                />
              )}
            </dl>

            {draft.originalInput && (
              <div className="mt-3 border-l-4 border-line pl-3">
                <p className="label">
                  {draft.inputLanguage && draft.inputLanguage !== "en"
                    ? "Your words (original)"
                    : "Your words"}
                </p>
                <p className="italic">&ldquo;{draft.originalInput}&rdquo;</p>
                {draft.translation && (
                  <>
                    <p className="label mt-2">In English</p>
                    <p className="italic">&ldquo;{draft.translation}&rdquo;</p>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-lg font-semibold">Is this correct?</p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="btn btn-lg btn-primary" onClick={onSave} disabled={saving}>
          <Check className="h-5 w-5" aria-hidden />
          {saving ? "Saving..." : "Yes, save this"}
        </button>
        <button
          type="button"
          className="btn btn-lg btn-secondary"
          onClick={onRevise}
          disabled={saving}
        >
          <Pencil className="h-5 w-5" aria-hidden />
          Change something
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">
        Nothing is saved until you choose to save it.
      </p>
    </section>
  );
}
