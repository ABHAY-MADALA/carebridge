import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { BackendDatabase } from "../lib/backend/database";
import { ProfileStore } from "../lib/backend/store";
import { handleBackend } from "../lib/backend/http";
import { FitbitService } from "../lib/backend/fitbit";
import { normalizeGooglePoints, googleFitbitProvider, type FitbitProvider } from "../lib/backend/fitbit-provider";
import { BackendError } from "../lib/backend/schema";
import { HealthEvent } from "../lib/schema";

async function main() {
  const db = new BackendDatabase(":memory:");
  const personal = new ProfileStore(db, "personal"); const alex = new ProfileStore(db, "alex-demo");
  let calls = 0;
  const config = { clientId: "fixture-client", clientSecret: "fixture-secret", redirectUri: "http://localhost:3000/api/backend/fitbit/callback" };
  const fixturePoint = { id: "fitbit:steps:2026-09-19", type: "steps" as const, unit: "steps" as const, value: 4820, date: "2026-09-19", timestamp: "2026-09-19", granularity: "day" as const, source: "fitbit" as const, importedAt: "2026-09-19T12:00:00Z" };
  // Explicit test fixture, injected server-side only. No demo/mock production path.
  const provider: FitbitProvider = {
    exchange: async () => { calls++; return { accessToken: "fixture-access", refreshToken: "fixture-refresh", expiresAt: Date.now()+3600000 }; },
    refresh: async () => { calls++; return { accessToken: "fixture-refreshed", refreshToken: "fixture-refresh", expiresAt: Date.now()+3600000 }; },
    measurements: async () => { calls++; return { points: [fixturePoint], unavailable: ["sleepMinutes", "restingHeartRate"] }; },
  };
  const fitbit = new FitbitService(db, provider, config);
  let cookie = ""; let context = ""; let checks = 0;
  async function request(path: string, input?: unknown, overrides: Record<string,string> = {}) {
    const response = await handleBackend(new Request(`http://localhost:3000/api/backend/${path}`, {
      method: input === undefined ? "GET" : "POST",
      headers: { cookie, "x-carebridge-request": "1", "x-carebridge-context": context, "content-type": "application/json", ...overrides },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }), path.split("?")[0].split("/"), db, fitbit);
    return { response, data: await response.json() };
  }
  async function check(name: string, fn: () => Promise<void> | void) { await fn(); checks++; console.log(`PASS ${name}`); }
  try {
    await check("No anonymous health access, no automatic demo fallback", async () => {
      assert.equal((await request("health")).response.status, 401);
      const session = await request("session", {}); assert.equal(session.response.status, 201);
      cookie = session.response.headers.get("set-cookie")!.split(";")[0]; context = session.data.context;
      assert.equal(session.data.profile.id, "personal");
      const health = await request("health"); assert.equal(health.data.events.length, 0);
      assert.equal(health.data.baseline.message, "Building your baseline"); assert.equal(health.data.detection.triggered, false);
    });
    await check("CSRF, unknown identities, missing/stale context rejected", async () => {
      assert.equal((await request("events", {}, { origin: "https://attacker.invalid" })).response.status, 403);
      assert.equal((await request("profile", { userId: "other" })).response.status, 400);
      assert.equal((await request("health", undefined, { "x-carebridge-context": "" })).response.status, 409);
      const remote = await handleBackend(new Request("https://example.com/api/backend/session", { method: "POST" }), ["session"], db); assert.equal(remote.status, 403);
    });
    const entry = HealthEvent.parse({ id: randomUUID(), label: "Personal headache", category: "pain", severity: 5, inputMethod: "visual", bodyLocation: "Head", originalInput: "personal original words", occurredAt: new Date().toISOString(), recordedAt: new Date().toISOString() });
    await check("Confirmed body-picture/event write is owner-stamped and preserved", async () => {
      assert.equal((await request("events", { events: [entry] })).response.status, 400);
      assert.equal((await request("events", { confirmed: true, events: [{ ...entry, userId: "alex-demo" }] })).response.status, 403);
      const saved = await request("events", { confirmed: true, events: [entry] }); assert.equal(saved.response.status, 200);
      assert.equal(saved.data.events[0].userId, "personal"); assert.equal(saved.data.events[0].originalInput, entry.originalInput);
    });
    await check("AI endpoints reject supplied cross-profile record context", async () => {
      assert.equal((await request("ask", { question: "When?", events: [{ userId: "alex-demo" }] })).response.status, 400);
      assert.equal((await request("assistant", { text: "Pain", messages: [{ role: "user", content: "Alex records" }] })).response.status, 400);
      const answer = await request("ask", { question: "Have I had chest pain?" }); assert.equal(answer.data.answered, false);
    });
    await check("Generated summary, approval and speech are scoped consistently", async () => {
      const generated = await request("summary/generate", {});
      assert.equal(generated.data.userId, "personal"); assert.equal(personal.summary(), null, "generation must not save");
      assert.equal((await request("speech")).response.status, 409);
      await request("summary/save", { confirmed: true, approve: true, summary: generated.data });
      const full = await request("speech"); const section = await request("speech?section=started");
      assert.equal(full.response.status, 200); assert.ok(full.data.text.includes(section.data.text));
    });
    await check("OAuth alone establishes connection; status never exposes tokens", async () => {
      assert.equal((await request("fitbit/status")).data.connected, false);
      assert.equal((await request("fitbit/callback?state=invalid&code=x")).response.status, 400);
      const start = await request("fitbit/start", {}); assert.equal(start.response.status, 200);
      const url = new URL(start.data.authorizationUrl); assert.ok(url.searchParams.get("scope")!.includes("health_metrics_and_measurements"));
      assert.equal((await request("fitbit/status")).data.connected, false);
      const state = url.searchParams.get("state")!;
      const done = await request(`fitbit/callback?state=${state}&code=fixture-code`); assert.equal(done.response.status, 200);
      assert.equal((await request(`fitbit/callback?state=${state}&code=replay`)).response.status, 400);
      const status = await request("fitbit/status"); assert.equal(status.data.connected, true); assert.ok(!JSON.stringify(status.data).includes("fixture-access"));
      const sync = await request("fitbit/sync", {}); assert.equal(sync.data.metricsCount, 1);
      assert.equal(personal.metrics()[0].value, 4820); assert.equal(alex.metrics().length, 0);
      assert.equal(personal.daily().find(m => m.date === "2026-09-19")!.sleepMinutes, null);
    });
    const stale = context;
    await check("Switch invalidates old context; Alex has no real Fitbit", async () => {
      const switched = await request("profile", { userId: "alex-demo" }); context = switched.data.context;
      assert.equal((await request("health", undefined, { "x-carebridge-context": stale })).response.status, 409);
      const status = await request("fitbit/status"); assert.equal(status.data.connected, false); assert.equal(status.data.allowed, false);
      const before = calls;
      assert.equal((await request("fitbit/start", {})).response.status, 403);
      assert.equal((await request("fitbit/sync", {})).response.status, 403);
      assert.equal((await request("fitbit/disconnect", { confirmed: true })).response.status, 403);
      assert.equal(calls, before);
      assert.ok(!JSON.stringify((await request("health")).data).includes("Personal headache"));
    });
    await check("Demo AI stays offline; drafts never create events", async () => {
      const before = alex.events().length;
      const oldFetch = globalThis.fetch;
      globalThis.fetch = async () => { throw new Error("Demo must never access network"); };
      try {
        const one = await request("assistant", { text: "My lower stomach has been hurting a lot today." });
        assert.equal(one.data.action, "ask");
        const two = await request("assistant", { text: "About seven.", conversationId: one.data.conversationId });
        assert.equal(two.data.action, "propose"); assert.equal(two.data.drafts[0].severity, 7);
        assert.equal(alex.events().length, before);
        assert.equal((await request("ask", { question: "Have I had chest pain?" })).data.answered, false);
      } finally { globalThis.fetch = oldFetch; }
    });
    await check("Demo reset does not touch Personal connection/events/metrics", async () => {
      const before = JSON.stringify([personal.events(), personal.metrics(), personal.connection()]);
      assert.equal((await request("demo/reset", { confirmed: true })).response.status, 200);
      assert.equal(JSON.stringify([personal.events(), personal.metrics(), personal.connection()]), before);
    });
    await check("OAuth pending before switch cannot bind to new profile", async () => {
      context = (await request("profile", { userId: "personal" })).data.context;
      const start = await request("fitbit/start", {}); const state = new URL(start.data.authorizationUrl).searchParams.get("state")!;
      context = (await request("profile", { userId: "alex-demo" })).data.context;
      assert.equal((await request(`fitbit/callback?state=${state}&code=fixture`)).response.status, 403);
      context = (await request("profile", { userId: "personal" })).data.context;
      assert.equal((await request(`fitbit/callback?state=${state}&code=fixture`)).response.status, 400);
    });
    await check("Disconnect during provider fetch prevents a late sync write", async () => {
      const session = db.session(cookie.split("=")[1]);
      const racing = new FitbitService(db, { ...provider, measurements: async () => { db.inSession(session, () => personal.disconnect()); return { points: [{ ...fixturePoint, value: 999 }], unavailable: [] }; } }, config);
      await assert.rejects(() => racing.sync(session), /connection-changed/);
      assert.equal(personal.metrics()[0].value, 4820); assert.equal(personal.connection(), null);
    });
    await check("Google normalization preserves zero, omits unknown fields, uses explicit units", () => {
      const civil = { date: { year: 2026, month: 9, day: 19 } };
      const steps = normalizeGooglePoints("steps", { rollupDataPoints: [{ civilStartTime: civil, steps: { countSum: "0" } }, { civilStartTime: { date: { year: 2026, month: 9, day: 18 } } }] }, "now");
      assert.equal(steps.length, 1); assert.equal(steps[0].value, 0);
      const hr = normalizeGooglePoints("restingHeartRate", { dataPoints: [{ dailyRestingHeartRate: { date: civil.date, beatsPerMinute: "65" } }] }, "now");
      assert.equal(hr[0].value, 65); assert.equal(hr[0].unit, "bpm");
      assert.equal(normalizeGooglePoints("restingHeartRate", { rollupDataPoints: [{ restingHeartRatePersonalRange: { beatsPerMinuteMin: 60, beatsPerMinuteMax: 70 } }] }, "now").length, 0);
      const sleep = normalizeGooglePoints("sleepMinutes", { dataPoints: [{ dataPointName: "sleep-1", sleep: { interval: { startTime: "2026-09-18T22:00:00Z", endTime: "2026-09-19T06:00:00Z", civilEndTime: civil }, summary: { minutesAsleep: "434" } } }] }, "now");
      assert.equal(sleep[0].value, 434); assert.equal(sleep[0].timestamp, "2026-09-19T06:00:00Z"); assert.equal(sleep[0].providerRecords![0].startTime, "2026-09-18T22:00:00Z");
    });
    await check("Provider requests paginate; unavailable data is not fabricated", async () => {
      const oldFetch = globalThis.fetch; let sleepPages = 0; let stepsPages = 0;
      globalThis.fetch = async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/steps/")) {
          stepsPages++;
          return Response.json({ rollupDataPoints: [] });
        }
        if (url.pathname.includes("/sleep/")) {
          sleepPages++; assert.ok(url.searchParams.get("filter")!.includes("civil_end_time"));
          return Response.json(sleepPages === 1 ? { dataPoints: [], nextPageToken: "page2" } : { dataPoints: [] });
        }
        return new Response("unavailable", { status: 403 });
      };
      try { const data = await googleFitbitProvider.measurements("fixture", "2026-09-01", "2026-09-20"); assert.equal(data.points.length, 0); assert.equal(data.unavailable.length, 3); assert.equal(sleepPages, 2); assert.equal(stepsPages, 3); }
      finally { globalThis.fetch = oldFetch; }
    });
    await check("Sleep uses wake-up timestamp and explicit offset when civil time is absent", () => {
      const sleep = (interval: Record<string, unknown>, minutes: unknown = "434", id = "fixture-sleep") => ({
        dataPointName: id, sleep: { interval, summary: { minutesAsleep: minutes } },
      });
      const cases = [
        { endTime: "2026-09-19T02:00:00Z", endUtcOffset: "-14400s", expected: "2026-09-18" },
        { endTime: "2026-12-31T22:00:00Z", endUtcOffset: "19800s", expected: "2027-01-01" },
        { endTime: "2026-03-01T02:00:00.000000001Z", endUtcOffset: "-18000s", expected: "2026-02-28" },
        { endTime: "2026-09-19T02:00:00Z", endUtcOffset: "0s", expected: "2026-09-19" },
        { endTime: "2026-11-01T04:30:00Z", startUtcOffset: "-14400s", endUtcOffset: "-18000s", expected: "2026-10-31" },
      ];
      for (const { expected, ...interval } of cases) {
        const points = normalizeGooglePoints("sleepMinutes", { dataPoints: [sleep(interval)] }, "now");
        assert.equal(points.length, 1); assert.equal(points[0].date, expected); assert.equal(points[0].value, 434);
        assert.equal(points[0].timestamp, interval.endTime);
        assert.equal(points[0].providerRecords![0].id, "fixture-sleep");
      }
      const interval = { endTime: "2026-09-19T02:00:00Z", endUtcOffset: "-14400s" };
      const explicit = normalizeGooglePoints("sleepMinutes", { dataPoints: [sleep({ ...interval, civilEndTime: { date: { year: 2026, month: 9, day: 19 } } })] }, "now");
      assert.equal(explicit[0].date, "2026-09-19", "valid provider civil date remains authoritative");
      const combined = normalizeGooglePoints("sleepMinutes", { dataPoints: [sleep(interval), sleep(interval), sleep(interval, "20", "nap")] }, "now");
      assert.equal(combined.length, 1); assert.equal(combined[0].value, 454); assert.equal(combined[0].providerRecords!.length, 2);
      assert.equal(normalizeGooglePoints("sleepMinutes", { dataPoints: [sleep(interval, "0")] }, "now")[0].value, 0);
      for (const invalid of [
        { endTime: interval.endTime }, { endUtcOffset: "0s" },
        { ...interval, endUtcOffset: "bad" }, { ...interval, endUtcOffset: "86400s" },
        { ...interval, endTime: "bad" }, { ...interval, endTime: "2026-02-30T02:00:00Z" },
      ]) assert.equal(normalizeGooglePoints("sleepMinutes", { dataPoints: [sleep(invalid)] }, "now").length, 0);
    });
    await check("Steps split into contiguous seven-day ranges with independent pagination", async () => {
      const oldFetch = globalThis.fetch;
      const requests: { range: { start: { date: { year: number; month: number; day: number } }; end: { date: { year: number; month: number; day: number } } }; pageSize: number; windowSizeDays: number; dataSourceFamily: string; pageToken?: string }[] = [];
      const key = (d: { year: number; month: number; day: number }) => `${d.year}-${String(d.month).padStart(2,"0")}-${String(d.day).padStart(2,"0")}`;
      globalThis.fetch = async (input, init) => {
        if (!String(input).includes("/steps/")) return Response.json({ dataPoints: [] });
        const body = JSON.parse(String(init?.body)); requests.push(body);
        const begin = Date.parse(`${key(body.range.start.date)}T00:00:00Z`);
        const end = Date.parse(`${key(body.range.end.date)}T00:00:00Z`);
        const rows = [];
        for (let day = begin; day < end; day += 86400000) {
          const d = new Date(day);
          rows.push({ civilStartTime: { date: { year: d.getUTCFullYear(), month: d.getUTCMonth()+1, day: d.getUTCDate() } }, steps: { countSum: "100" } });
        }
        return Response.json(body.pageToken ? { rollupDataPoints: rows.slice(1) } : { rollupDataPoints: rows.slice(0,1), nextPageToken: "fixture-page2" });
      };
      try {
        const result = await googleFitbitProvider.measurements("fixture", "2026-12-15", "2027-01-15");
        assert.equal(result.points.length, 31); assert.equal(new Set(result.points.map(p=>p.date)).size, 31);
        assert.ok(!result.unavailable.includes("steps")); assert.equal(requests.length, 10);
        const boundaries = ["2026-12-15", "2026-12-22", "2026-12-29", "2027-01-05", "2027-01-12", "2027-01-15"];
        for (let i=0; i<5; i++) {
          const first = requests[i*2]; const second = requests[i*2+1];
          assert.equal(key(first.range.start.date), boundaries[i]); assert.equal(key(first.range.end.date), boundaries[i+1]);
          assert.equal(first.pageSize, 7); assert.equal(first.windowSizeDays, 1);
          assert.equal(first.dataSourceFamily, "users/me/dataSourceFamilies/google-wearables");
          assert.equal(first.pageToken, undefined); assert.deepEqual(second, { ...first, pageToken: "fixture-page2" });
        }
      } finally { globalThis.fetch = oldFetch; }
    });
    await check("A failed steps chunk never imports a partial daily series; auth and page limits remain enforced", async () => {
      const oldFetch = globalThis.fetch;
      try {
        let stepCalls = 0;
        globalThis.fetch = async input => {
          if (!String(input).includes("/steps/")) return Response.json({ dataPoints: [] });
          stepCalls++;
          return stepCalls === 1 ? Response.json({ rollupDataPoints: [{ civilStartTime: { date: { year: 2026, month: 9, day: 1 } }, steps: { countSum: "100" } }] }) : new Response(null, { status: 500 });
        };
        const failed = await googleFitbitProvider.measurements("fixture", "2026-09-01", "2026-09-20");
        assert.equal(stepCalls, 2); assert.equal(failed.points.length, 0); assert.ok(failed.unavailable.includes("steps"));
        globalThis.fetch = async () => new Response(null, { status: 401 });
        await assert.rejects(()=>googleFitbitProvider.measurements("fixture", "2026-09-01", "2026-09-20"), /reauth-required/);
        stepCalls = 0;
        globalThis.fetch = async input => {
          if (!String(input).includes("/steps/")) return Response.json({ dataPoints: [] });
          stepCalls++; return Response.json({ rollupDataPoints: [], nextPageToken: "repeated" });
        };
        const capped = await googleFitbitProvider.measurements("fixture", "2026-09-01", "2026-09-20");
        assert.equal(stepCalls, 20); assert.ok(capped.unavailable.includes("steps"));
      } finally { globalThis.fetch = oldFetch; }
    });
    await check("Failed token exchange never creates a connection", async () => {
      const session = db.session(cookie.split("=")[1]);
      const bad = new FitbitService(db, { ...provider, exchange: async () => { throw new BackendError(401, "reauth-required"); } }, config);
      const state = new URL(bad.start(session, "http://localhost:3000").authorizationUrl).searchParams.get("state")!;
      await assert.rejects(() => bad.callback(session, state, "bad-code")); assert.equal(personal.connection(), null);
    });
    console.log(`${checks} backend API/OAuth checks passed.`);
  } finally { db.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
