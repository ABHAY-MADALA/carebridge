"use client";
import { useState } from "react";
import { useProfile } from "@/components/profile/ProfileProvider";
import { useHealthData } from "@/components/health/useHealthData";
export function ProfileControls() {
  const { profile } = useProfile();
  const { patientSettings, savePatientSettings, resetDemo } = useHealthData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  return <div>
    {error && <p role="alert" className="text-danger">{error}</p>}
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
                    } catch {
                      setError("The demo could not be reset. Please try again.");
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
        <h2 className="text-lg font-semibold text-ink">Health information processing</h2>
        <p className="mt-1 text-sm text-muted">
          {profile.synthetic
            ? "Alex uses only HealthThread's local rules. Fictional demo records are never sent to an external AI provider."
            : "HealthThread uses local rules by default. You may allow the configured model to help structure or reword only what you enter in HealthThread. This does not connect to or read your ChatGPT, Claude, or Gemini account."}
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
              }).catch(() => setError("The privacy preference could not be saved."));
            }}
          />
          <span className="font-medium">
            Allow a configured model to help organize my HealthThread entries
          </span>
        </label>
      </section>


  </div>;
}
