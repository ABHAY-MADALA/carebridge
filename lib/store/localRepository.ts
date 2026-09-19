import {
  DailyMetric,
  DoctorSummary,
  HealthEvent,
} from "@/lib/schema";
import type { Repository } from "./repository";

const KEYS = {
  events: "carebridge.events.v1",
  metrics: "carebridge.metrics.v1",
  summary: "carebridge.summary.v1",
  seeded: "carebridge.seeded.v1",
} as const;

/** Fired after every write so open pages re-read without a manual refresh. */
export const STORE_EVENT = "carebridge:store-changed";

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORE_EVENT));
  }
}

function read<T>(key: string, schema: { parse: (v: unknown) => T }, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return schema.parse(JSON.parse(raw));
  } catch {
    // A corrupt or outdated record must never break the app mid-demo; start clean.
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the in-memory view stays correct for this session */
  }
}

const EventArray = HealthEvent.array();
const MetricArray = DailyMetric.array();

export class LocalRepository implements Repository {
  async listEvents(): Promise<HealthEvent[]> {
    const events = read(KEYS.events, EventArray, [] as HealthEvent[]);
    return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async addEvent(event: HealthEvent) {
    await this.addEvents([event]);
  }

  async addEvents(events: HealthEvent[]) {
    const current = read(KEYS.events, EventArray, [] as HealthEvent[]);
    write(KEYS.events, [...current, ...events.map((e) => HealthEvent.parse(e))]);
    notify();
  }

  async updateEvent(id: string, patch: Partial<HealthEvent>) {
    const current = read(KEYS.events, EventArray, [] as HealthEvent[]);
    write(
      KEYS.events,
      current.map((e) => (e.id === id ? HealthEvent.parse({ ...e, ...patch }) : e)),
    );
    notify();
  }

  async deleteEvent(id: string) {
    const current = read(KEYS.events, EventArray, [] as HealthEvent[]);
    write(
      KEYS.events,
      current.filter((e) => e.id !== id),
    );
    notify();
  }

  async listMetrics(): Promise<DailyMetric[]> {
    const metrics = read(KEYS.metrics, MetricArray, [] as DailyMetric[]);
    return [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  }

  async putMetrics(metrics: DailyMetric[]) {
    write(KEYS.metrics, metrics.map((m) => DailyMetric.parse(m)));
    notify();
  }

  async getSummary(): Promise<DoctorSummary | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(KEYS.summary);
      if (!raw) return null;
      return DoctorSummary.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async saveSummary(summary: DoctorSummary | null) {
    if (typeof window === "undefined") return;
    if (summary === null) {
      window.localStorage.removeItem(KEYS.summary);
    } else {
      write(KEYS.summary, DoctorSummary.parse(summary));
    }
    notify();
  }

  async isSeeded() {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(KEYS.seeded) === "yes";
  }

  async markSeeded() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEYS.seeded, "yes");
  }

  async reset() {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
    notify();
  }
}
