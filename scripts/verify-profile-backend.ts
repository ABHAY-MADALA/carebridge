import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BackendDatabase } from "../lib/backend/database";
import { ProfileStore } from "../lib/backend/store";
import { healthSnapshot, aiContext, generateSummary, timeline } from "../lib/backend/health";
import { HealthEvent } from "../lib/schema";
import { buildMetrics, buildEvents } from "../lib/store/seed";

const directory = mkdtempSync(join(tmpdir(), "carebridge-isolation-test-"));
const filename = join(directory, "test.sqlite");
const db = new BackendDatabase(filename);
const personal = new ProfileStore(db, "personal");
const alex = new ProfileStore(db, "alex-demo");
const write = <T>(fn: () => T) => db.transaction(fn);
const event = (id: string, label: string) => HealthEvent.parse({ id, label, category: "pain", severity: 5, inputMethod: "text", originalInput: label, occurredAt: new Date().toISOString(), recordedAt: new Date().toISOString() });
let checks = 0;
const check = (name: string, fn: () => void) => { fn(); checks++; console.log(`PASS ${name}`); };
try {
  write(() => alex.ensureDemo());
  check("Personal starts empty; Alex retains 84 synthetic days", () => {
    assert.equal(personal.events().length, 0); assert.equal(personal.daily().length, 0); assert.equal(alex.daily().length, 84);
    assert.ok(alex.events().every(e => e.synthetic && e.userId === "alex-demo"));
  });
  const connection = { userId: "personal" as const, accessToken: "test-token", refreshToken: null, expiresAt: Date.now()+3600000, authorizedAt: new Date().toISOString(), lastSyncAt: null, generation: "test-generation" };
  write(() => personal.saveConnection(connection));
  const points = buildMetrics().slice(-15).map((m,i) => ({ id: `fitbit-sleep-${m.date}`, type: "sleepMinutes" as const, value: i < 11 ? 500 : 400, unit: "minutes" as const, timestamp: m.date, date: m.date, granularity: "day" as const, source: "fitbit" as const, importedAt: new Date().toISOString() }));
  write(() => personal.importFitbit(points, connection.generation, new Date().toISOString()));
  check("1 Personal Fitbit metrics never enter Alex queries", () => { assert.equal(alex.metrics().length, 0); assert.ok(alex.daily().every(m => m.source === "demo")); });
  check("2 Alex metrics never enter Personal queries", () => { assert.ok(personal.daily().every(m => m.userId === "personal" && !m.synthetic && m.source === "fitbit")); assert.equal(personal.daily().length, 15); });
  write(() => { personal.addEvents([event("same-id", "Personal headache")], true); alex.addEvents([event("same-id", "Demo ache")], true); });
  check("3 Personal events never enter Alex timeline", () => assert.ok(!JSON.stringify(timeline(alex)).includes("Personal headache")));
  check("4 Alex events never enter Personal timeline", () => assert.ok(!JSON.stringify(timeline(personal)).includes("Demo ache")));
  check("5 Personal baseline uses only Personal history", () => assert.equal(healthSnapshot(personal).baseline.values.sleepMinutes?.mean, 500));
  check("6 Alex baseline uses only Alex history", () => { assert.notEqual(healthSnapshot(alex).baseline.values.sleepMinutes?.mean, 500); assert.equal(healthSnapshot(alex).detection.triggered, true); });
  check("7 Personal summary contains only Personal records", () => { const summary = generateSummary(personal); assert.ok(JSON.stringify(summary).includes("Personal headache")); assert.ok(!JSON.stringify(summary).includes("Demo ache")); });
  check("8 Alex summary contains only Alex records", () => assert.ok(!JSON.stringify(generateSummary(alex)).includes("Personal headache")));
  check("9 AI context is exclusively current-user data", () => {
    for (const store of [personal, alex]) { const context = aiContext(store); assert.ok(context.events.every(e => e.userId === store.userId)); assert.equal(context.detection.userId, store.userId); }
    assert.ok(!JSON.stringify(aiContext(personal)).includes("Demo ache")); assert.ok(!JSON.stringify(aiContext(alex)).includes("Personal headache"));
  });
  const alexBefore = JSON.stringify(timeline(alex));
  write(() => personal.disconnect());
  check("10 Disconnect Personal Fitbit leaves Alex unchanged", () => { assert.equal(personal.connection(), null); assert.equal(JSON.stringify(timeline(alex)), alexBefore); assert.equal(personal.metrics().length, 15); });
  const personalBefore = JSON.stringify(timeline(personal));
  write(() => alex.resetDemo(true));
  check("11 Demo reset leaves Personal unchanged", () => assert.equal(JSON.stringify(timeline(personal)), personalBefore));
  check("12 Fitbit writes and connections are rejected for Alex", () => {
    assert.throws(() => write(() => alex.importFitbit(points, "test", new Date().toISOString())), /fitbit-personal-only/);
    assert.throws(() => write(() => alex.saveConnection(connection)), /fitbit-personal-only/);
    assert.throws(() => write(() => alex.disconnect()), /fitbit-personal-only/);
  });
  check("No implicit save and no owner spoofing", () => {
    assert.throws(() => write(() => personal.addEvents([event("new", "Pain")], false)), /confirmation-required/);
    assert.throws(() => write(() => personal.addEvents([{ ...event("new", "Pain"), userId: "alex-demo" }], true)), /ownership-mismatch/);
    assert.throws(() => write(() => personal.saveSummary(generateSummary(alex), false)), /ownership-mismatch/);
    assert.throws(() => write(() => personal.resetDemo(true)), /demo-reset-only/);
  });
  check("Cross-profile delete cannot resolve another profile's ID", () => assert.throws(() => write(() => personal.deleteEvent(alex.events()[0].id, true)), /event-not-found/));
  check("Stale sync cannot reconnect or write after disconnect", () => assert.throws(() => write(() => personal.importFitbit(points, connection.generation, new Date().toISOString())), /connection-changed/));
  check("Session switch invalidates stale requests and is not global", () => {
    const one = db.createSession(); const two = db.createSession(); const switched = db.switchProfile(one.session, "alex-demo");
    assert.equal(switched.revision, 2); assert.throws(() => db.inSession(one.session, () => personal.addEvents([event("stale", "Never save")], true)), /profile-context-changed/);
    assert.equal(db.session(two.token).userId, "personal"); assert.equal(db.session(one.token).userId, "alex-demo");
  });
  check("Migration is synthetic-only, idempotent and preserves originals", () => {
    const data = { events: buildEvents(), metrics: buildMetrics() };
    write(() => alex.importDemo(data, true)); assert.equal(write(() => alex.importDemo(data, true)).imported, false);
    assert.throws(() => write(() => personal.importDemo(data, true)), /synthetic-confirmation-required/);
    assert.throws(() => write(() => alex.importDemo({ ...data, metrics: [{ ...data.metrics[0], source: "fitbit" }] }, true)), /real-data-in-demo-import/);
    assert.equal(JSON.stringify(timeline(personal)), personalBefore);
  });
  check("Settings and conversations are profile-owned", () => {
    write(() => { personal.saveSettings({ language: "es" }); personal.saveConversation("thread", [{ role: "user", content: "personal-only" }]); });
    assert.equal(alex.settings().language, "en"); assert.equal(alex.conversation("thread").length, 0);
  });
  check("Server database survives reopening", () => {
    const reopened = new BackendDatabase(filename); assert.equal(new ProfileStore(reopened, "personal").events().length, 1); reopened.close();
  });
  console.log(`${checks} profile isolation checks passed.`);
} finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
