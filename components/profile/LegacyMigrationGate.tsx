"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Check, FlaskConical, ShieldCheck, UserRound } from "lucide-react";
import type { ProfileId, ProfileInfo } from "@/lib/backend/client";
import {
  MIGRATION_PLAN_KEY,
  MIGRATION_REVIEWED_KEY,
  classifyLegacyStorage,
  clearLegacyHealthStorage,
  type MigrationPlan,
} from "@/lib/migration/legacy";

type Request = <T>(
  path: string,
  options?: { method?: "GET" | "POST"; body?: unknown },
) => Promise<T>;

export function LegacyMigrationGate({
  profile,
  request,
  switchProfile,
  onComplete,
}: {
  profile: ProfileInfo;
  request: Request;
  switchProfile: (id: ProfileId) => Promise<void>;
  onComplete: () => void;
}) {
  const snapshot = useMemo(() => classifyLegacyStorage(window.localStorage), []);
  const [syntheticConfirmed, setSyntheticConfirmed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [clearAfter, setClearAfter] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo<MigrationPlan | null>(() => {
    try {
      const raw = window.sessionStorage.getItem(MIGRATION_PLAN_KEY);
      return raw ? (JSON.parse(raw) as MigrationPlan) : null;
    } catch {
      return null;
    }
  }, [profile.id]);

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;

    const savePlan = (next: MigrationPlan) => {
      window.sessionStorage.setItem(MIGRATION_PLAN_KEY, JSON.stringify(next));
    };

    const run = async () => {
      setWorking(true);
      setError(null);
      try {
        if (plan.stage === "alex") {
          if (profile.id !== "alex-demo") {
            await switchProfile("alex-demo");
            return;
          }
          if (plan.importSynthetic) {
            await request("demo/import", {
              method: "POST",
              body: {
                confirmedSynthetic: true,
                events: snapshot.syntheticEvents,
                metrics: snapshot.syntheticMetrics,
              },
            });
          }
          const next = { ...plan, stage: "personal" as const };
          savePlan(next);
          await switchProfile("personal");
          return;
        }

        if (plan.stage === "personal") {
          if (profile.id !== "personal") {
            await switchProfile("personal");
            return;
          }
          const chosen = snapshot.ambiguousEvents
            .filter((event) => plan.selectedPersonalIds.includes(event.id))
            .map((event) => ({
              ...event,
              id: crypto.randomUUID(),
            }));
          for (let index = 0; index < chosen.length; index += 100) {
            await request("events", {
              method: "POST",
              body: {
                confirmed: true,
                events: chosen.slice(index, index + 100),
              },
            });
          }
          savePlan({ ...plan, stage: "finish" });
          window.location.reload();
          return;
        }

        if (plan.stage === "finish") {
          if (plan.clearLegacy) clearLegacyHealthStorage(window.localStorage);
          window.localStorage.setItem(MIGRATION_REVIEWED_KEY, "yes");
          window.sessionStorage.removeItem(MIGRATION_PLAN_KEY);
          if (!cancelled) onComplete();
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? `Migration stopped: ${cause.message}`
              : "Migration stopped before any remaining records were moved.",
          );
        }
      } finally {
        if (!cancelled) setWorking(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [onComplete, plan, profile.id, request, snapshot, switchProfile]);

  const begin = () => {
    const importSynthetic =
      syntheticConfirmed &&
      (snapshot.syntheticEvents.length > 0 || snapshot.syntheticMetrics.length > 0);
    const next: MigrationPlan = {
      stage: importSynthetic ? "alex" : "personal",
      importSynthetic,
      selectedPersonalIds: [...selected],
      clearLegacy: clearAfter,
    };
    window.sessionStorage.setItem(MIGRATION_PLAN_KEY, JSON.stringify(next));
    window.location.reload();
  };

  const startClean = () => {
    window.localStorage.setItem(MIGRATION_REVIEWED_KEY, "yes");
    window.sessionStorage.removeItem(MIGRATION_PLAN_KEY);
    onComplete();
  };

  if (plan) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <section className="card p-6" aria-busy={working}>
          <p className="label">Moving reviewed records</p>
          <h1 className="mt-1 text-2xl font-semibold">Keeping both profiles separate</h1>
          <p className="mt-2 text-muted">
            {plan.stage === "alex"
              ? "Importing confirmed synthetic records into Alex only…"
              : plan.stage === "personal"
                ? "Importing only the entries you selected into Personal…"
                : "Finishing the migration…"}
          </p>
          {error && (
            <div className="mt-4 rounded-xl bg-warn-soft p-4" role="alert">
              <p className="font-semibold text-danger">{error}</p>
              <p className="mt-1 text-sm text-muted">
                Your browser copy has not been deleted. You can keep it untouched and use
                the fresh backend profiles instead.
              </p>
              <button type="button" className="btn btn-secondary mt-3" onClick={startClean}>
                Use fresh profiles and keep the browser copy
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="card p-6">
        <p className="label">One-time review</p>
        <h1 className="mt-1 text-2xl font-semibold">Review existing browser data</h1>
        <p className="mt-2 text-muted">
          CareBridge found records from the earlier single-profile version. It will not
          guess who they belong to. Nothing is moved or deleted until you choose.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <FlaskConical className="h-5 w-5" aria-hidden />
              Alex · clearly synthetic
            </h2>
            <p className="mt-2 text-sm text-muted">
              {snapshot.syntheticEvents.length} seeded events and{" "}
              {snapshot.syntheticMetrics.length} demo measurement days.
            </p>
            <label className="mt-3 flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={syntheticConfirmed}
                onChange={(event) => setSyntheticConfirmed(event.target.checked)}
              />
              <span className="text-sm">
                I confirm these are demo/synthetic records only. Import them into Alex.
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-line p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <UserRound className="h-5 w-5" aria-hidden />
              Entries with ambiguous ownership
            </h2>
            <p className="mt-2 text-sm text-muted">
              Select an entry only if it is genuinely yours. Unselected records stay in
              the old browser copy.
            </p>
            {snapshot.ambiguousEvents.length ? (
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                {snapshot.ambiguousEvents.map((event) => (
                  <li key={event.id}>
                    <label className="flex items-start gap-2 rounded-lg bg-raised p-2">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5"
                        checked={selected.has(event.id)}
                        onChange={(change) => {
                          setSelected((previous) => {
                            const next = new Set(previous);
                            if (change.target.checked) next.add(event.id);
                            else next.delete(event.id);
                            return next;
                          });
                        }}
                      />
                      <span className="text-sm">
                        <span className="block font-semibold">{event.label}</span>
                        <span className="block text-muted">
                          {new Date(event.occurredAt).toLocaleDateString()} ·{" "}
                          {event.originalInput || "No original words recorded"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No ambiguous entries found.</p>
            )}
          </div>
        </div>

        {snapshot.legacyFitbitMetrics.length > 0 && (
          <div className="mt-4 rounded-xl border border-warn/40 bg-warn-soft p-4">
            <p className="font-semibold">
              {snapshot.legacyFitbitMetrics.length} old Fitbit day
              {snapshot.legacyFitbitMetrics.length === 1 ? "" : "s"} will not be imported.
            </p>
            <p className="mt-1 text-sm text-muted">
              Reconnect the real Fitbit account in Personal. CareBridge will never copy
              old wearable rows into Alex or present them as newly authorized data.
            </p>
          </div>
        )}

        {snapshot.summaryPresent && (
          <p className="mt-4 text-sm text-muted">
            The old summary will not be imported. Each profile will generate a new
            summary from its own separated records.
          </p>
        )}

        <label className="mt-5 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={clearAfter}
            onChange={(event) => setClearAfter(event.target.checked)}
          />
          <span className="text-sm">
            After successful migration, remove the old health keys from this browser.
            Accessibility and tutorial preferences stay.
          </span>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={begin}>
            <ShieldCheck className="h-5 w-5" aria-hidden />
            Move only the records I reviewed
          </button>
          <button type="button" className="btn btn-secondary" onClick={startClean}>
            <Archive className="h-5 w-5" aria-hidden />
            Start clean and keep the old browser copy
          </button>
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Check className="h-4 w-4" aria-hidden />
          Personal never receives Alex&apos;s seed. Alex never receives selected Personal
          entries.
        </p>
      </section>
    </main>
  );
}
