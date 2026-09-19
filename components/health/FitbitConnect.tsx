"use client";

import { useEffect, useState } from "react";
import { Watch, RefreshCw, Unlink } from "lucide-react";
import { useHealthData } from "@/components/health/useHealthData";
import { useT } from "@/components/a11y/useT";
import { fitbitSource, type HealthSourceStatus } from "@/lib/health/sources";
import { syncFitbit } from "@/lib/health/fitbitSync";
import { formatDayHeading, dateKeyOf } from "@/lib/dates";

type Phase = "loading" | "setup-required" | "disconnected" | "connected";

/*
  Five real states, never a faked one: loading, Setup required (env vars
  absent), Disconnected, Connected (only once OAuth succeeded AND a real
  metric came back), and — layered on top of Connected — a transient
  sync-failed banner or a revert to Disconnected on reauth-required. There is
  no "Connected" state this component can reach without a genuine successful
  sync; a failed or empty sync leaves it in Disconnected/error, not a
  simulated success.
*/
export function FitbitConnect() {
  const { metrics } = useHealthData();
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>("loading");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const lastFitbitMetric = metrics
    .filter((m) => m.source === "fitbit")
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const refreshStatus = async () => {
    const status: HealthSourceStatus = await fitbitSource.status();
    setPhase(!status.configured ? "setup-required" : status.connected ? "connected" : "disconnected");
    return status;
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncError(null);
    const result = await syncFitbit();
    setSyncing(false);
    if (result.ok) {
      setPhase("connected");
      return;
    }
    if (result.reason === "reauth-required") {
      setPhase("disconnected");
      setSyncError(t("home.fitbitReauth"));
      return;
    }
    // "connected, but the last sync didn't go through" — tokens are kept,
    // this is presented as transient, not a disconnect.
    setSyncError(t("home.fitbitSyncFailed"));
  };

  useEffect(() => {
    (async () => {
      const status = await refreshStatus();
      const query = new URLSearchParams(window.location.search);
      const fitbitParam = query.get("fitbit");
      if (fitbitParam) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      if (fitbitParam === "connected" && status.connected) {
        await runSync();
      } else if (fitbitParam === "error") {
        setSyncError(t("home.fitbitConnectError"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    await fitbitSource.disconnect();
    setPhase("disconnected");
    setSyncError(null);
  };

  return (
    <section className="card p-5" aria-labelledby="fitbit-heading">
      <div className="flex items-center gap-2">
        <Watch className="h-5 w-5" aria-hidden />
        <h2 id="fitbit-heading" className="text-xl font-bold">
          {t("home.fitbitHeading")}
        </h2>
      </div>

      {phase === "loading" && <p className="mt-2 text-base text-muted">{t("home.fitbitChecking")}</p>}

      {phase === "setup-required" && (
        <p className="mt-2 text-base text-muted">{t("home.fitbitSetupRequired")}</p>
      )}

      {phase === "disconnected" && (
        <>
          <p className="mt-2 text-base text-muted">{t("home.fitbitDisconnectedBody")}</p>
          {syncError && <p className="mt-2 text-sm text-danger">{syncError}</p>}
          <button type="button" className="btn btn-md btn-primary mt-4" onClick={() => fitbitSource.connect()}>
            <Watch className="h-5 w-5" aria-hidden />
            {t("home.fitbitConnect")}
          </button>
        </>
      )}

      {phase === "connected" && (
        <>
          <p className="mt-2 text-base text-muted">{t("home.fitbitConnectedBanner")}</p>
          <p className="mt-1 text-sm text-muted">
            {lastFitbitMetric
              ? t("home.fitbitLastSynced", {
                  when: formatDayHeading(dateKeyOf(new Date(lastFitbitMetric.date).toISOString())),
                })
              : t("home.fitbitConnected")}
          </p>
          {syncError && <p className="mt-2 text-sm text-danger">{syncError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-md btn-secondary"
              onClick={() => void runSync()}
              disabled={syncing}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {syncing ? t("home.fitbitSyncing") : t("home.fitbitSyncNow")}
            </button>
            <button type="button" className="btn btn-md btn-ghost" onClick={() => void disconnect()}>
              <Unlink className="h-4 w-4" aria-hidden />
              {t("home.fitbitDisconnect")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
