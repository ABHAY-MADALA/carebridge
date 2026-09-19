"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  DailyMetric,
  DoctorSummary,
  DraftEvent,
  HealthEvent,
  InputMethod,
  TrendDetection,
} from "@/lib/schema";
import { draftToEvent } from "@/lib/health/createEvent";
import type { BaselineSet } from "@/lib/health/baseline";
import {
  BackendClientError,
  StaleProfileResponseError,
  type BaselineResponse,
  type HealthMetric,
  type HealthSnapshotResponse,
  type OwnedSummary,
  type PatientSettings,
  type TimelineEntry,
} from "@/lib/backend/client";
import { useProfile } from "@/components/profile/ProfileProvider";

/*
  One profile-scoped read model for the whole app.

  The browser never computes ownership, baselines or trends. It asks the
  backend for the active session context, and the backend performs every query
  through ProfileStore. The arrays in this provider are display state only.
*/

type Ctx = {
  loading: boolean;
  error: string | null;
  events: HealthEvent[];
  metrics: DailyMetric[];
  healthMetrics: HealthMetric[];
  timeline: TimelineEntry[];
  detection: TrendDetection | null;
  baseline: BaselineSet | null;
  baselineInfo: BaselineResponse | null;
  summary: DoctorSummary | null;
  saveDrafts: (drafts: DraftEvent[], inputMethod: InputMethod) => Promise<HealthEvent[]>;
  deleteEvent: (id: string) => Promise<void>;
  saveSummary: (summary: DoctorSummary | null) => Promise<void>;
  generateSummary: () => Promise<DoctorSummary>;
  getApprovedSpeech: (section?: string) => Promise<string>;
  resetDemo: () => Promise<void>;
  refresh: () => Promise<void>;
  patientSettings: PatientSettings | null;
  savePatientSettings: (settings: PatientSettings) => Promise<void>;
};

const HealthDataContext = createContext<Ctx | null>(null);

export function HealthDataProvider({ children }: { children: React.ReactNode }) {
  const { context, request, recoverSession } = useProfile();
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [detection, setDetection] = useState<TrendDetection | null>(null);
  const [baseline, setBaseline] = useState<BaselineSet | null>(null);
  const [baselineInfo, setBaselineInfo] = useState<BaselineResponse | null>(null);
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [patientSettings, setPatientSettings] = useState<PatientSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const requestedContext = context;
    try {
      const [health, timelineResponse, summaryResponse, settingsResponse] =
        await Promise.all([
          request<HealthSnapshotResponse>("health"),
          request<{ entries: TimelineEntry[] }>("timeline"),
          request<{ summary: OwnedSummary | null }>("summary"),
          request<{ settings: PatientSettings }>("settings"),
        ]);
      if (requestedContext !== context) return;
      setEvents(health.events);
      setMetrics(health.daily);
      setHealthMetrics(health.metrics);
      setDetection(health.detection);
      setBaseline(health.baseline.values);
      setBaselineInfo(health.baseline);
      setTimeline(timelineResponse.entries);
      setSummary(summaryResponse.summary);
      setPatientSettings(settingsResponse.settings);
      setError(null);
    } catch (cause) {
      if (cause instanceof StaleProfileResponseError || cause instanceof DOMException) return;
      if (
        cause instanceof BackendClientError &&
        (cause.code === "profile-context-required-or-stale" ||
          cause.code === "profile-context-changed")
      ) {
        await recoverSession();
        return;
      }
      setError(
        cause instanceof BackendClientError
          ? cause.code
          : "Your health information could not be loaded.",
      );
    }
  }, [context, recoverSession, request]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents([]);
    setMetrics([]);
    setHealthMetrics([]);
    setTimeline([]);
    setDetection(null);
    setBaseline(null);
    setBaselineInfo(null);
    setSummary(null);
    setPatientSettings(null);
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [context, refresh]);

  const saveDrafts = useCallback(
    async (drafts: DraftEvent[], inputMethod: InputMethod) => {
      const finalized = drafts.map((d) => draftToEvent(d, inputMethod, metrics));
      const result = await request<{ events: HealthEvent[] }>("events", {
        method: "POST",
        body: { confirmed: true, events: finalized },
      });
      await refresh();
      return result.events;
    },
    [metrics, refresh, request],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      await request("events/delete", {
        method: "POST",
        body: { confirmed: true, id },
      });
      await refresh();
    },
    [refresh, request],
  );

  const saveSummary = useCallback(
    async (next: DoctorSummary | null) => {
      if (!next) {
        setSummary(null);
        return;
      }
      const saved = await request<OwnedSummary>("summary/save", {
        method: "POST",
        body: {
          confirmed: true,
          approve: next.approved,
          summary: next,
        },
      });
      setSummary(saved);
    },
    [request],
  );

  const generateSummary = useCallback(async () => {
    const generated = await request<OwnedSummary>("summary/generate", {
      method: "POST",
      body: {},
    });
    setSummary(generated);
    return generated;
  }, [request]);

  const getApprovedSpeech = useCallback(
    async (section?: string) => {
      const query = section ? `?section=${encodeURIComponent(section)}` : "";
      const result = await request<{ text: string }>(`speech${query}`);
      return result.text;
    },
    [request],
  );

  const resetDemo = useCallback(async () => {
    await request("demo/reset", {
      method: "POST",
      body: { confirmed: true },
    });
    await refresh();
  }, [refresh, request]);

  const savePatientSettings = useCallback(
    async (next: PatientSettings) => {
      const saved = await request<PatientSettings>("settings", {
        method: "POST",
        body: next,
      });
      setPatientSettings(saved);
    },
    [request],
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      events,
      metrics,
      healthMetrics,
      timeline,
      detection,
      baseline,
      baselineInfo,
      summary,
      saveDrafts,
      deleteEvent,
      saveSummary,
      generateSummary,
      getApprovedSpeech,
      resetDemo,
      refresh,
      patientSettings,
      savePatientSettings,
    }),
    [
      loading,
      error,
      events,
      metrics,
      healthMetrics,
      timeline,
      detection,
      baseline,
      baselineInfo,
      summary,
      saveDrafts,
      deleteEvent,
      saveSummary,
      generateSummary,
      getApprovedSpeech,
      resetDemo,
      refresh,
      patientSettings,
      savePatientSettings,
    ],
  );

  return <HealthDataContext.Provider value={value}>{children}</HealthDataContext.Provider>;
}

export function useHealthData() {
  const ctx = useContext(HealthDataContext);
  if (!ctx) throw new Error("useHealthData must be used inside HealthDataProvider");
  return ctx;
}
