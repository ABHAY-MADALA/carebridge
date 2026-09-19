/*
  A HealthSource is anything that can hand CareBridge real wearable readings.
  Fitbit is the only one actually wired up — through the Google Health API,
  which replaced Fitbit's own Web API in 2026 (see app/api/fitbit/*). Apple
  Health and Health Connect are typed here so the shape of a future native
  integration is honest, but neither is imported or rendered anywhere: no
  component may show them as connected.
*/

export interface HealthSourceStatus {
  configured: boolean;
  connected: boolean;
  lastSyncAt: string | null;
}

export interface HealthSourceSyncResult {
  ok: boolean;
  metricsCount: number;
  reason?: "not-configured" | "not-connected" | "reauth-required" | "sync-failed" | "not-implemented";
}

export interface HealthSource {
  id: "fitbit" | "apple-health" | "health-connect";
  label: string;
  status(): Promise<HealthSourceStatus>;
  /** Navigates the browser to the provider's consent screen. No-op for stubs. */
  connect(): void;
  sync(): Promise<HealthSourceSyncResult>;
  disconnect(): Promise<void>;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  return (await res.json()) as T;
}

export const fitbitSource: HealthSource = {
  id: "fitbit",
  label: "Fitbit",
  status: () => getJson<HealthSourceStatus>("/api/fitbit/status"),
  connect: () => {
    window.location.href = "/api/fitbit/start";
  },
  sync: () => getJson<HealthSourceSyncResult>("/api/fitbit/sync", { method: "POST" }),
  disconnect: async () => {
    await fetch("/api/fitbit/disconnect", { method: "POST" });
  },
};

const notImplemented: HealthSourceStatus = { configured: false, connected: false, lastSyncAt: null };

export const appleHealthSource: HealthSource = {
  id: "apple-health",
  label: "Apple Health",
  status: async () => notImplemented,
  connect: () => {},
  sync: async () => ({ ok: false, metricsCount: 0, reason: "not-implemented" }),
  disconnect: async () => {},
};

export const healthConnectSource: HealthSource = {
  id: "health-connect",
  label: "Health Connect",
  status: async () => notImplemented,
  connect: () => {},
  sync: async () => ({ ok: false, metricsCount: 0, reason: "not-implemented" }),
  disconnect: async () => {},
};
