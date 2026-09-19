import assert from "node:assert/strict";
import { buildEvents, buildMetrics } from "../lib/store/seed";
import {
  buildBackendHeaders,
  mayRetryAfterStaleContext,
  responseBelongsToProfile,
} from "../lib/backend/client";
import {
  LEGACY_KEYS,
  classifyLegacyStorage,
  hasLegacyHealthData,
} from "../lib/migration/legacy";

function storage(values: Record<string, string>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
  };
}

function run(name: string, test: () => void) {
  test();
  console.log(`PASS ${name}`);
}

run("Protected reads include only the active profile context", () => {
  const headers = buildBackendHeaders("personal:4", "GET", false);
  assert.equal(headers.get("X-CareBridge-Context"), "personal:4");
  assert.equal(headers.get("X-CareBridge-Request"), null);
  assert.equal(headers.get("Content-Type"), null);
});

run("Mutations require the CSRF marker and JSON without a body user id", () => {
  const headers = buildBackendHeaders("alex-demo:8", "POST", true);
  assert.equal(headers.get("X-CareBridge-Context"), "alex-demo:8");
  assert.equal(headers.get("X-CareBridge-Request"), "1");
  assert.equal(headers.get("Content-Type"), "application/json");
});

run("Late Personal responses are rejected after switching to Alex", () => {
  assert.equal(
    responseBelongsToProfile("personal:1", "alex-demo:2", "personal:1"),
    false,
  );
  assert.equal(
    responseBelongsToProfile("personal:1", "personal:1", "alex-demo:2"),
    false,
  );
  assert.equal(
    responseBelongsToProfile("personal:1", "personal:1", "personal:1"),
    true,
  );
});

run("Stale writes are never automatically replayed", () => {
  assert.equal(mayRetryAfterStaleContext("GET"), true);
  assert.equal(mayRetryAfterStaleContext("POST"), false);
});

run("Legacy synthetic records and ambiguous entries are separated", () => {
  const events = buildEvents();
  const custom = {
    ...events[0],
    id: "custom-person-or-demo-entry",
    originalInput: "This ownership must be reviewed.",
  };
  const snapshot = classifyLegacyStorage(
    storage({
      [LEGACY_KEYS.events]: JSON.stringify([...events, custom]),
      [LEGACY_KEYS.metrics]: JSON.stringify(buildMetrics()),
    }),
  );
  assert.equal(snapshot.syntheticEvents.length, events.length);
  assert.deepEqual(snapshot.ambiguousEvents.map((event) => event.id), [custom.id]);
  assert.equal(snapshot.syntheticMetrics.length, 84);
  assert.equal(snapshot.legacyFitbitMetrics.length, 0);
  assert.equal(hasLegacyHealthData(snapshot), true);
});

run("Legacy Fitbit measurements cannot enter Alex's import bucket", () => {
  const metrics = buildMetrics();
  const realWearable = { ...metrics[0], date: "2026-01-01", source: "fitbit" as const };
  const snapshot = classifyLegacyStorage(
    storage({
      [LEGACY_KEYS.metrics]: JSON.stringify([...metrics, realWearable]),
    }),
  );
  assert.equal(snapshot.syntheticMetrics.some((row) => row.source === "fitbit"), false);
  assert.deepEqual(snapshot.legacyFitbitMetrics, [realWearable]);
});

run("Legacy summaries are review-only and never migration payloads", () => {
  const snapshot = classifyLegacyStorage(
    storage({
      [LEGACY_KEYS.summary]: JSON.stringify({
        generatedAt: new Date().toISOString(),
        sections: [],
        approved: true,
        approvedAt: new Date().toISOString(),
        quotedStatements: [],
        source: "deterministic",
      }),
    }),
  );
  assert.equal(snapshot.summaryPresent, true);
  assert.equal(snapshot.syntheticEvents.length, 0);
  assert.equal(snapshot.ambiguousEvents.length, 0);
});

console.log("7 profile frontend boundary checks passed.");
