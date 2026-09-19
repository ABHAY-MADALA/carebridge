"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, RefreshCw, Unlink, Watch } from "lucide-react";
import { useHealthData } from "@/components/health/useHealthData";
import { useProfile } from "@/components/profile/ProfileProvider";
import {
  BackendClientError,
  type FitbitStatus,
  type FitbitSyncResult,
} from "@/lib/backend/client";

type Phase =
  | "loading"
  | "demo"
  | "setup-required"
  | "disconnected"
  | "connected";

const MEASUREMENT_LABELS = {
  sleepMinutes: "Sleep",
  restingHeartRate: "Resting heart rate",
  steps: "Steps and activity",
} as const;

export function FitbitConnect() {
  const { profile, context, request } = useProfile();
  const { healthMetrics, refresh } = useHealthData();
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<FitbitStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableTypes = [...new Set(healthMetrics.map((metric) => metric.type))];

  const refreshStatus = useCallback(async () => {
    const next = await request<FitbitStatus>("fitbit/status");
    setStatus(next);
    setPhase(
      !next.allowed
        ? "demo"
        : !next.configured
          ? "setup-required"
          : next.connected
            ? "connected"
            : "disconnected",
    );
    return next;
  }, [request]);

  useEffect(() => {
    setPhase("loading");
    setMessage(null);
    setError(null);
    void refreshStatus()
      .then((next) => {
        const query = new URLSearchParams(window.location.search);
        const result = query.get("fitbit");
        const reason = query.get("reason");
        if (result) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        if (result === "connected" && next.connected) {
          setMessage("Fitbit authorization succeeded. Sync to import your real measurements.");
        } else if (result === "error") {
          setError(
            reason
              ? `Fitbit authorization did not finish (${reason}).`
              : "Fitbit authorization did not finish.",
          );
        }
      })
      .catch(() => {
        setError("Fitbit status could not be checked.");
        setPhase(profile.synthetic ? "demo" : "disconnected");
      });
  }, [context, profile.synthetic, refreshStatus]);

  const connect = async () => {
    setError(null);
    const result = await request<{ authorizationUrl: string }>("fitbit/start", {
      method: "POST",
      body: {},
    });
    window.location.assign(result.authorizationUrl);
  };

  const runSync = async () => {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await request<FitbitSyncResult>("fitbit/sync", {
        method: "POST",
        body: {},
      });
      await Promise.all([refresh(), refreshStatus()]);
      if (result.ok) {
        setMessage(
          `Synced ${result.metricsCount} real measurement${
            result.metricsCount === 1 ? "" : "s"
          }.`,
        );
      } else {
        setMessage("Fitbit is connected, but no supported measurements were available.");
      }
      if (result.unavailable.length) {
        setError(`Unavailable in this sync: ${result.unavailable.join(", ")}.`);
      }
    } catch (cause) {
      if (
        cause instanceof BackendClientError &&
        cause.code === "reauth-required"
      ) {
        setPhase("disconnected");
        setError("Fitbit authorization expired. Connect again to continue syncing.");
      } else {
        setError(
          cause instanceof BackendClientError
            ? `Sync failed (${cause.code}).`
            : "Sync failed. Your existing measurements were not changed.",
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    setError(null);
    await request("fitbit/disconnect", {
      method: "POST",
      body: { confirmed: true },
    });
    await refreshStatus();
    setMessage(
      "Fitbit disconnected. Measurements already imported into your Personal history were preserved.",
    );
  };

  return (
    <section className="card p-5" aria-labelledby="fitbit-heading">
      <div className="flex items-center gap-2">
        {phase === "demo" ? (
          <FlaskConical className="h-5 w-5" aria-hidden />
        ) : (
          <Watch className="h-5 w-5" aria-hidden />
        )}
        <h2 id="fitbit-heading" className="text-xl font-bold">
          {phase === "demo" ? "Demo wearable data" : "Fitbit"}
        </h2>
      </div>

      {phase === "loading" && (
        <p className="mt-2 text-base text-muted">Checking the active profile…</p>
      )}

      {phase === "demo" && (
        <>
          <p className="mt-2 text-base text-muted">
            Alex never connects to Fitbit. Every wearable-style measurement in this
            profile is synthetic and stays available without internet access.
          </p>
          <p className="mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold">
            Demo · Synthetic data
          </p>
        </>
      )}

      {phase === "setup-required" && (
        <>
          <p className="mt-2 text-base text-muted">
            Real Fitbit authorization is not configured on this computer yet.
          </p>
          <p className="mt-2 text-sm text-muted">
            Add the Google Health client ID, client secret and the exact backend callback
            URI to <code>.env.local</code>. HealthThread will not pretend to connect.
          </p>
        </>
      )}

      {phase === "disconnected" && (
        <>
          <p className="mt-2 text-base text-muted">
            Connect your real account to import supported sleep, steps and resting-heart-
            rate measurements into your Personal profile only.
          </p>
          <button
            type="button"
            className="btn btn-md btn-primary mt-4"
            onClick={() => void connect()}
          >
            <Watch className="h-5 w-5" aria-hidden />
            Connect Fitbit
          </button>
        </>
      )}

      {phase === "connected" && (
        <>
          <p className="mt-2 font-semibold text-good">Connected</p>
          <p className="mt-1 text-sm text-muted">
            Last synced:{" "}
            {status?.lastSyncAt
              ? new Date(status.lastSyncAt).toLocaleString()
              : "Not synced yet"}
          </p>

          <div className="mt-4">
            <p className="label">Available real measurements</p>
            {availableTypes.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {availableTypes.map((type) => (
                  <li
                    key={type}
                    className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium"
                  >
                    {MEASUREMENT_LABELS[type]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">
                No measurements imported yet. Missing measurements will stay missing.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-md btn-secondary"
              onClick={() => void runSync()}
              disabled={syncing}
            >
              <RefreshCw
                className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                aria-hidden
              />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              className="btn btn-md btn-ghost"
              onClick={() => void disconnect()}
              disabled={syncing}
            >
              <Unlink className="h-4 w-4" aria-hidden />
              Disconnect
            </button>
          </div>
        </>
      )}

      {message && (
        <p role="status" className="mt-3 rounded-xl bg-brand-soft p-3 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
