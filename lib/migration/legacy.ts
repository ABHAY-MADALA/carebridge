import { DailyMetric, DoctorSummary, HealthEvent } from "@/lib/schema";

export const LEGACY_KEYS = {
  events: "carebridge.events.v1",
  metrics: "carebridge.metrics.v1",
  summary: "carebridge.summary.v1",
  seeded: "carebridge.seeded.v1",
} as const;

export const MIGRATION_REVIEWED_KEY = "carebridge.migration.reviewed.v1";
export const MIGRATION_PLAN_KEY = "carebridge.migration.plan.v1";

export type LegacySnapshot = {
  syntheticEvents: HealthEvent[];
  ambiguousEvents: HealthEvent[];
  syntheticMetrics: DailyMetric[];
  legacyFitbitMetrics: DailyMetric[];
  summaryPresent: boolean;
  invalidRecords: number;
};

function parseArray<T>(
  raw: string | null,
  parse: (value: unknown) => T,
): { values: T[]; invalid: number } {
  if (!raw) return { values: [], invalid: 0 };
  try {
    const input = JSON.parse(raw);
    if (!Array.isArray(input)) return { values: [], invalid: 1 };
    const values: T[] = [];
    let invalid = 0;
    for (const item of input) {
      try {
        values.push(parse(item));
      } catch {
        invalid += 1;
      }
    }
    return { values, invalid };
  } catch {
    return { values: [], invalid: 1 };
  }
}

export function classifyLegacyStorage(storage: Pick<Storage, "getItem">): LegacySnapshot {
  const events = parseArray(storage.getItem(LEGACY_KEYS.events), (value) =>
    HealthEvent.parse(value),
  );
  const metrics = parseArray(storage.getItem(LEGACY_KEYS.metrics), (value) =>
    DailyMetric.parse(value),
  );

  let summaryPresent = false;
  const summaryRaw = storage.getItem(LEGACY_KEYS.summary);
  if (summaryRaw) {
    try {
      DoctorSummary.parse(JSON.parse(summaryRaw));
      summaryPresent = true;
    } catch {
      // It is still legacy health content, but not safe to import.
      summaryPresent = true;
    }
  }

  return {
    syntheticEvents: events.values.filter((event) => event.id.startsWith("seed-")),
    ambiguousEvents: events.values.filter((event) => !event.id.startsWith("seed-")),
    syntheticMetrics: metrics.values.filter((metric) => metric.source === "demo"),
    legacyFitbitMetrics: metrics.values.filter((metric) => metric.source === "fitbit"),
    summaryPresent,
    invalidRecords: events.invalid + metrics.invalid,
  };
}

export function hasLegacyHealthData(snapshot: LegacySnapshot) {
  return (
    snapshot.syntheticEvents.length > 0 ||
    snapshot.ambiguousEvents.length > 0 ||
    snapshot.syntheticMetrics.length > 0 ||
    snapshot.legacyFitbitMetrics.length > 0 ||
    snapshot.summaryPresent ||
    snapshot.invalidRecords > 0
  );
}

export function clearLegacyHealthStorage(storage: Pick<Storage, "removeItem">) {
  for (const key of Object.values(LEGACY_KEYS)) storage.removeItem(key);
}

export type MigrationPlan = {
  stage: "alex" | "personal" | "finish";
  importSynthetic: boolean;
  selectedPersonalIds: string[];
  clearLegacy: boolean;
};

