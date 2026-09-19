"use client";

import { Check, Pencil } from "lucide-react";
import type { DraftEvent } from "@/lib/schema";
import { CATEGORY_EMOJI, severityFace } from "@/lib/health/categories";
import { useT } from "@/components/a11y/useT";

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
  const { t, tRaw } = useT();
  const severityWords = tRaw<string[]>("severityScale.words");

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!h) return t("confirmationCard.durationMinOnly", { m });
    return t("confirmationCard.durationHM", { h, m: String(m).padStart(2, "0") });
  };

  return (
    <section className="card fade-up border-2 border-brand p-5" aria-labelledby="understood">
      <h3 id="understood" className="text-xl font-bold">
        {t("confirmationCard.heading")}
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
                  label={t("confirmationCard.howStrong")}
                  value={
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="text-xl">
                        {severityFace(draft.severity)}
                      </span>
                      {draft.severity}/10
                      <span className="text-muted">({severityWords[draft.severity]})</span>
                    </span>
                  }
                />
              )}
              {draft.bodyLocation && <Row label={t("confirmationCard.where")} value={draft.bodyLocation} />}
              {draft.onset && <Row label={t("confirmationCard.started")} value={draft.onset} />}
              {draft.pattern && <Row label={t("confirmationCard.pattern")} value={draft.pattern} />}
              {draft.durationMinutes ? (
                <Row label={t("confirmationCard.howLong")} value={formatDuration(draft.durationMinutes)} />
              ) : null}
              {draft.trendHint && (
                <Row
                  label={t("confirmationCard.comparedWithBefore")}
                  value={
                    draft.trendHint === "worse"
                      ? t("confirmationCard.worse")
                      : draft.trendHint === "better"
                        ? t("confirmationCard.better")
                        : t("confirmationCard.same")
                  }
                />
              )}
            </dl>

            {draft.originalInput && (
              <div className="mt-3 border-l-4 border-line pl-3">
                <p className="label">
                  {draft.inputLanguage && draft.inputLanguage !== "en"
                    ? t("confirmationCard.yourWordsOriginal")
                    : t("confirmationCard.yourWords")}
                </p>
                <p className="italic">&ldquo;{draft.originalInput}&rdquo;</p>
                {draft.translation && (
                  <>
                    <p className="label mt-2">{t("confirmationCard.inEnglish")}</p>
                    <p className="italic">&ldquo;{draft.translation}&rdquo;</p>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-lg font-semibold">{t("confirmationCard.isThisCorrect")}</p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="btn btn-lg btn-primary" onClick={onSave} disabled={saving}>
          <Check className="h-5 w-5" aria-hidden />
          {saving ? t("confirmationCard.saving") : t("confirmationCard.yesSave")}
        </button>
        <button
          type="button"
          className="btn btn-lg btn-secondary"
          onClick={onRevise}
          disabled={saving}
        >
          <Pencil className="h-5 w-5" aria-hidden />
          {t("confirmationCard.changeSomething")}
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">
        {t("confirmationCard.notSavedYet")}
      </p>
    </section>
  );
}
