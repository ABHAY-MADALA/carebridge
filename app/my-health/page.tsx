"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FitbitConnect } from "@/components/health/FitbitConnect";
import { useT } from "@/components/a11y/useT";
import { useProfile } from "@/components/profile/ProfileProvider";
import { useHealthData } from "@/components/health/useHealthData";

/*
  Fitbit is the one real integration; Apple Health / Health Connect are
  named quietly as future connections via their typed stubs in
  lib/health/sources.ts — never rendered as connected, never dominating
  the page.
*/
export default function MyHealthPage() {
  const { t } = useT();
  const { profile } = useProfile();
  const {
    patientSettings,
    savePatientSettings,
    resetDemo,
  } = useHealthData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  return (
    <div>
      <PageHeader
        title={t("nav.myHealth")}
        description={
          profile.synthetic
            ? "Alex · Demo profile. All measurements shown here are synthetic."
            : "Abhay · Personal profile. Real connected-health data belongs only here."
        }
      />
      <FitbitConnect />

      {profile.synthetic && (
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Reset demo scenario</h2>
          <p className="mt-1 text-sm text-muted">
            This replaces Alex&apos;s records with the original deterministic 84-day
            synthetic history. It cannot modify Abhay&apos;s Personal events, Fitbit
            connection or measurements.
          </p>
          {!confirmReset ? (
            <button
              type="button"
              className="btn btn-secondary mt-4"
              onClick={() => setConfirmReset(true)}
            >
              Reset Alex demo
            </button>
          ) : (
            <div className="mt-4 rounded-xl bg-warn-soft p-4">
              <p className="font-semibold">Reset Alex&apos;s synthetic data?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={resetting}
                  onClick={async () => {
                    setResetting(true);
                    try {
                      await resetDemo();
                      setConfirmReset(false);
                    } finally {
                      setResetting(false);
                    }
                  }}
                >
                  {resetting ? "Resetting…" : "Yes, reset Alex only"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={resetting}
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">AI privacy</h2>
        <p className="mt-1 text-sm text-muted">
          {profile.synthetic
            ? "Alex always uses CareBridge's offline deterministic assistant. Demo records are never sent to an external AI provider."
            : "By default, Personal uses the offline deterministic assistant. You can opt in to the configured external AI provider for more natural wording."}
        </p>
        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={profile.synthetic ? false : Boolean(patientSettings?.allowExternalAI)}
            disabled={profile.synthetic || !patientSettings}
            onChange={(event) => {
              if (!patientSettings) return;
              void savePatientSettings({
                ...patientSettings,
                allowExternalAI: event.target.checked,
              });
            }}
          />
          <span className="font-medium">
            Allow external AI for this Personal profile
          </span>
        </label>
      </section>

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
