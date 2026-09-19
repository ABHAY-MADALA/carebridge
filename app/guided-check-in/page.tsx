"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ManualEntry } from "@/components/manual/ManualEntry";
import { useT } from "@/components/a11y/useT";

/*
  ManualEntry's existing step-by-step wizard (built for Low Stimulation),
  forced on regardless of that setting — same save() path, same data model,
  just its own dedicated entry point for someone who wants one question at
  a time without turning on Low Stimulation generally.
*/
export default function GuidedCheckInPage() {
  const { t } = useT();
  return (
    <div>
      <PageHeader title={t("home.guidedCheckIn")} description={t("home.manualBody")} />
      <ManualEntry forceWizard startOpen pageContext />
    </div>
  );
}
