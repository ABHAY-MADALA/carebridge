"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ManualEntry } from "@/components/manual/ManualEntry";
import { GuidedHistoryCheckIn } from "@/components/manual/GuidedHistoryCheckIn";
import { useT } from "@/components/a11y/useT";

/*
  ManualEntry's existing step-by-step wizard (built for Low Stimulation),
  forced on regardless of that setting — same save() path, same data model,
  just its own dedicated entry point for someone who wants one question at
  a time without turning on Low Stimulation generally.
*/
export default function GuidedCheckInPage() {
  const { t, lang } = useT();
  return (
    <div>
      <PageHeader
        title={t("home.guidedCheckIn")}
        description={
          lang === "es"
            ? "Registra cambios del período, vejiga, intestino o una condición continua con una pregunta corta a la vez."
            : "Record period, bladder, bowel, or ongoing-condition changes with one short question at a time."
        }
      />
      <GuidedHistoryCheckIn />
      <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-7" aria-labelledby="other-check-in-heading">
        <h2 id="other-check-in-heading" className="text-xl font-semibold text-ink">
          {lang === "es" ? "¿Quieres registrar otra cosa?" : "Want to record something else?"}
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          {lang === "es"
            ? "Usa el registro general para dolor, sueño, medicina, ánimo y otros cambios."
            : "Use the general check-in for pain, sleep, medicine, mood, and other changes."}
        </p>
        <ManualEntry forceWizard pageContext />
      </section>
    </div>
  );
}
