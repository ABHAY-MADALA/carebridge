import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/** Writes TEST data. Intentionally refuses port 3000 and has no default URL.
 * Run only against a disposable server/database, never the user's live record. */
async function main() {
  const base = new URL(process.env.PROFILE_TEST_BASE_URL ?? "http://invalid");
  assert.ok(["localhost", "127.0.0.1"].includes(base.hostname) && base.port && base.port !== "3000", "Set PROFILE_TEST_BASE_URL to a disposable loopback server on a non-3000 port");
  let cookie = ""; let context = "";
  async function request(path: string, payload?: unknown, expected = 200) {
    const res = await fetch(new URL(`/api/backend/${path}`, base), {
      method: payload === undefined ? "GET" : "POST",
      headers: { cookie, "x-carebridge-context": context, "x-carebridge-request": "1", "content-type": "application/json" },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    assert.equal(res.status, expected, path);
    if (res.headers.has("set-cookie")) cookie = res.headers.get("set-cookie")!.split(";")[0];
    return res.json();
  }
  context = (await request("session", {}, 201)).context;
  const initial = await request("health");
  assert.equal(initial.events.length, 0, "Refuse to write to an existing Personal record");
  assert.equal(initial.daily.length, 0, "Use a disposable empty database");
  assert.equal(initial.baseline.message, "Building your baseline");
  const marker = `TEST ONLY ${randomUUID()}`;
  await request("events", { confirmed: true, events: [{ id: randomUUID(), occurredAt: new Date().toISOString(), recordedAt: new Date().toISOString(), category: "pain", label: marker, inputMethod: "text", originalInput: marker }] });
  const personal = await request("timeline"); assert.ok(JSON.stringify(personal).includes(marker));
  context = (await request("profile", { userId: "alex-demo" })).context;
  const demo = await request("health"); assert.equal(demo.daily.length, 84); assert.equal(demo.detection.triggered, true);
  assert.ok(!JSON.stringify(demo).includes(marker));
  const summary = await request("summary/generate", {}); assert.ok(!JSON.stringify(summary).includes(marker));
  await request("summary/save", { confirmed: true, approve: true, summary });
  assert.ok((await request("speech")).text.length > 0);
  assert.equal((await request("fitbit/status")).connected, false);
  await request("fitbit/sync", {}, 403);
  await request("demo/reset", { confirmed: true });
  context = (await request("profile", { userId: "personal" })).context;
  assert.deepEqual(await request("timeline"), personal);
  console.log("PASS production HTTP rehearsal: isolated profiles, confirmation, timelines, summaries/speech, demo Fitbit rejection, reset and switch-back preservation.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
