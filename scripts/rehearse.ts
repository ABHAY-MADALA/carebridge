/*
  Walks the profile-aware demo against a running local CareBridge server.
  It writes only to Alex, resets Alex at the end, and proves Personal is
  byte-for-byte unchanged after switching back.
*/
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const BASE = new URL(process.env.BASE_URL ?? "http://localhost:3000");

async function main() {
  assert.ok(
    ["localhost", "127.0.0.1"].includes(BASE.hostname),
    "CareBridge profile rehearsal is local-only",
  );

  let cookie = "";
  let context = "";
  async function request<T>(path: string, body?: unknown, expected = 200): Promise<T> {
    const response = await fetch(new URL(`/api/backend/${path}`, BASE), {
      method: body === undefined ? "GET" : "POST",
      headers: {
        cookie,
        ...(context ? { "x-carebridge-context": context } : {}),
        ...(body === undefined
          ? {}
          : {
              "x-carebridge-request": "1",
              "content-type": "application/json",
            }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = await response.text();
    assert.equal(response.status, expected, `${path}: ${raw}`);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return JSON.parse(raw) as T;
  }

  const session = await request<{ context: string }>("session", {}, 201);
  context = session.context;
  const personalBefore = await request("timeline");

  context = (
    await request<{ context: string }>("profile", { userId: "alex-demo" })
  ).context;
  const health = await request<{
    daily: unknown[];
    detection: { triggered: boolean; signals: unknown[] };
    synthetic: boolean;
  }>("health");
  assert.equal(health.synthetic, true);
  assert.equal(health.daily.length, 84);
  assert.equal(health.detection.triggered, true);

  const first = await request<{
    conversationId: string;
    action: string;
    drafts: Array<Record<string, unknown>>;
  }>("assistant", { text: "My lower stomach has been hurting a lot today." });
  assert.equal(first.action, "ask");
  assert.equal(first.drafts[0]?.severity, null);

  const second = await request<{
    action: string;
    drafts: Array<Record<string, unknown>>;
  }>("assistant", {
    text: "About seven.",
    conversationId: first.conversationId,
  });
  assert.equal(second.action, "propose");
  assert.equal(second.drafts[0]?.severity, 7);

  const now = new Date().toISOString();
  await request("events", {
    confirmed: true,
    events: second.drafts.map((draft) => ({
      ...draft,
      id: randomUUID(),
      occurredAt: now,
      recordedAt: now,
      inputMethod: "text",
    })),
  });
  const timeline = await request<{ entries: unknown[] }>("timeline");
  assert.ok(JSON.stringify(timeline).includes("Abdominal pain"));

  const summary = await request<Record<string, unknown>>("summary/generate", {});
  assert.equal(summary.approved, false);
  const approved = await request<Record<string, unknown>>("summary/save", {
    confirmed: true,
    approve: true,
    summary,
  });
  assert.equal(approved.approved, true);
  const speech = await request<{ text: string }>("speech");
  assert.ok(speech.text.includes("CareBridge"));

  const known = await request<{ answered: boolean; citedEventIds: string[] }>("ask", {
    question: "When did this start?",
  });
  assert.equal(known.answered, true);
  assert.ok(known.citedEventIds.length > 0);
  const unknown = await request<{ answered: boolean }>("ask", {
    question: "Have you recorded any chest pain?",
  });
  assert.equal(unknown.answered, false);

  const fitbit = await request<{ allowed: boolean; connected: boolean }>("fitbit/status");
  assert.equal(fitbit.allowed, false);
  assert.equal(fitbit.connected, false);
  await request("fitbit/sync", {}, 403);

  await request("demo/reset", { confirmed: true });
  context = (
    await request<{ context: string }>("profile", { userId: "personal" })
  ).context;
  assert.deepEqual(await request("timeline"), personalBefore);

  console.log(
    "PASS integrated rehearsal: Personal unchanged; Alex assistant, confirmed event, timeline, trends, summary, speech, grounded Q&A, Fitbit rejection and reset all work.",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
