"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { FitbitConnect } from "@/components/health/FitbitConnect";
import { useT } from "@/components/a11y/useT";

/*
  Fitbit is the one real integration; Apple Health / Health Connect are
  named quietly as future connections via their typed stubs in
  lib/health/sources.ts — never rendered as connected, never dominating
  the page.
*/
export default function MyHealthPage() {
  const { t } = useT();
  return (
    <div>
      <PageHeader title={t("nav.myHealth")} />
      <FitbitConnect />

      <div className="mt-10">
        <p className="label mb-2">{t("myHealth.future")}</p>
        <ul className="space-y-1 text-sm text-muted">
          <li>{t("myHealth.appleHealth")}</li>
          <li>{t("myHealth.healthConnect")}</li>
        </ul>
      </div>
    </div>
  );
}
