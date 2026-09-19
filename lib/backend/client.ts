import type {
  BaselineStat,
  DailyMetric,
  DoctorSummary,
  HealthEvent,
  MetricKey,
  TrendDetection,
} from "@/lib/schema";
import type {
  HealthMetric,
  OwnedDaily,
  OwnedEvent,
  OwnedSummary,
  PatientSettings,
  ProfileId,
} from "@/lib/backend/schema";

export const BACKEND_PREFIX = "/api/backend";

export type ProfileInfo = {
  id: ProfileId;
  name: string;
  kind: "personal" | "demo";
  synthetic: boolean;
};

export type ProfileSession = {
  profile: ProfileInfo;
  profiles: ProfileInfo[];
  context: string;
};

export type BaselineResponse = {
  userId: ProfileId;
  values: Record<MetricKey, BaselineStat | null>;
  missingMetrics: MetricKey[];
  status: "building" | "ready";
  message: "Building your baseline" | "Your personal baseline";
  explanation: string | null;
};

export type HealthSnapshotResponse = {
  userId: ProfileId;
  synthetic: boolean;
  events: OwnedEvent[];
  metrics: HealthMetric[];
  daily: OwnedDaily[];
  summaryAvailable: boolean;
  detection: TrendDetection & { userId: ProfileId };
  baseline: BaselineResponse;
};

export type TimelineEntry =
  | {
      userId: ProfileId;
      kind: "event";
      timestamp: string;
      source: "Patient reported" | "Patient reported · Demo";
      event: OwnedEvent;
    }
  | {
      userId: ProfileId;
      kind: "daily";
      timestamp: string;
      source: "Fitbit" | "Synthetic wearable data";
      daily: OwnedDaily;
    };

export type FitbitStatus = {
  userId: ProfileId;
  configured: boolean;
  allowed: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  reason: null | "reauth-required" | "demo-synthetic-only";
};

export type FitbitSyncResult = {
  userId: "personal";
  ok: boolean;
  metricsCount: number;
  unavailable: string[];
  lastSyncAt: string | null;
  reason: null | "no-supported-measurements";
};

export type BackendAssistantTurn = {
  userId: ProfileId;
  conversationId: string;
  action: "ask" | "propose";
  question: string | null;
  reply: string;
  drafts: import("@/lib/schema").DraftEvent[];
  missingFields: string[];
  detectedLanguage: string;
  source: "llm" | "fallback";
};

export type BackendGroundedAnswer = import("@/lib/schema").GroundedAnswer & {
  userId: ProfileId;
};

export type BackendErrorBody = { error: string };

export class BackendClientError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
    this.name = "BackendClientError";
  }
}

export class StaleProfileResponseError extends Error {
  constructor() {
    super("stale-profile-response");
    this.name = "StaleProfileResponseError";
  }
}

export function isReadMethod(method?: string) {
  return !method || method.toUpperCase() === "GET";
}

export function buildBackendHeaders(
  context: string,
  method: string,
  hasBody: boolean,
) {
  const headers = new Headers();
  if (context) headers.set("X-CareBridge-Context", context);
  if (method !== "GET") headers.set("X-CareBridge-Request", "1");
  if (hasBody) headers.set("Content-Type", "application/json");
  return headers;
}

export function responseBelongsToProfile(
  requestContext: string,
  currentContext: string,
  responseContext: string | null,
) {
  return (
    requestContext === currentContext &&
    (!responseContext || responseContext === requestContext)
  );
}

/** Reads may be intentionally retried after session recovery; writes never are. */
export function mayRetryAfterStaleContext(method: string) {
  return method.toUpperCase() === "GET";
}

export type {
  DailyMetric,
  DoctorSummary,
  HealthEvent,
  HealthMetric,
  OwnedDaily,
  OwnedEvent,
  OwnedSummary,
  PatientSettings,
  ProfileId,
};
