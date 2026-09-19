import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { BackendDatabase } from "../lib/backend/database";
import { handleBackend } from "../lib/backend/http";
import { HealthEvent } from "../lib/schema";

type Json = Record<string, any>;

async function main() {
  const previousMode = process.env.HEALTHTHREAD_PUBLIC_DEMO;
  const previousOrigin = process.env.HEALTHTHREAD_PUBLIC_ORIGIN;
  process.env.HEALTHTHREAD_PUBLIC_DEMO = "1";
  process.env.HEALTHTHREAD_PUBLIC_ORIGIN = "https://demo.healththread.test";

  const db = new BackendDatabase(":memory:");
  let checks = 0;
  const check = async (name: string, fn: () => Promise<void>) => {
    await fn();
    checks++;
    console.log(`PASS ${name}`);
  };

  function client() {
    let cookie = "";
    let context = "";
    return {
      async request(path: string, input?: unknown, overrides: Record<string, string> = {}) {
        const method = input === undefined ? "GET" : "POST";
        const headers: Record<string, string> = {
          host: "demo.healththread.test",
          origin: "https://demo.healththread.test",
          ...(cookie ? { cookie } : {}),
          ...(context ? { "x-carebridge-context": context } : {}),
          ...(method === "POST"
            ? {
                "content-type": "application/json",
                "x-carebridge-request": "1",
              }
            : {}),
          ...overrides,
        };
        const response = await handleBackend(
          new Request(`https://demo.healththread.test/api/backend/${path}`, {
            method,
            headers,
            ...(input === undefined ? {} : { body: JSON.stringify(input) }),
          }),
          path.split("?")[0].split("/"),
          db,
        );
        const data = (await response.json()) as Json;
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";")[0];
        if (data.context) context = String(data.context);
        return { response, data };
      },
      async start() {
        return this.request("session", {});
      },
    };
  }

  try {
    const first = client();
    await check("Public session exposes only synthetic Alex", async () => {
      const session = await first.start();
      assert.equal(session.response.status, 201);
      assert.equal(session.data.profile.id, "alex-demo");
      assert.equal(session.data.profile.synthetic, true);
      assert.deepEqual(session.data.profiles.map((profile: Json) => profile.id), [
        "alex-demo",
      ]);
      assert.ok(session.response.headers.get("set-cookie")?.includes("Secure"));
      assert.ok(!JSON.stringify(session.data).includes("Abhay"));
    });

    await check("Alex starts with the deterministic demo scenario", async () => {
      const health = await first.request("health");
      assert.equal(health.response.status, 200);
      assert.equal(health.data.synthetic, true);
      assert.equal(health.data.daily.length, 84);
      assert.equal(health.data.events.length, 12);
      assert.equal(health.data.detection.triggered, true);
    });

    await check("Direct attempts to select Personal are rejected", async () => {
      const result = await first.request("profile", { userId: "personal" });
      assert.equal(result.response.status, 403);
      assert.equal(result.data.error, "profile-not-available");
    });

    const event = HealthEvent.parse({
      id: randomUUID(),
      label: "Session-only demo note",
      category: "pain",
      severity: 4,
      inputMethod: "visual",
      bodyLocation: "Right shoulder",
      originalInput: "Session-only demo note",
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    });
    await check("One visitor can interact without changing another visitor", async () => {
      const added = await first.request("events", {
        confirmed: true,
        events: [event],
      });
      assert.equal(added.response.status, 200);
      assert.equal((await first.request("health")).data.events.length, 13);

      const second = client();
      await second.start();
      const untouched = await second.request("health");
      assert.equal(untouched.data.events.length, 12);
      assert.ok(!JSON.stringify(untouched.data).includes(event.label));
    });

    await check("Cross-origin mutations and real OAuth are unavailable", async () => {
      const crossOrigin = await first.request(
        "events",
        { confirmed: true, events: [event] },
        { origin: "https://attacker.invalid" },
      );
      assert.equal(crossOrigin.response.status, 403);

      const callback = await first.request("fitbit/callback?state=x&code=x");
      assert.equal(callback.response.status, 403);
      assert.equal(callback.data.error, "public-demo-synthetic-only");
    });

    console.log(`${checks} public demo checks passed.`);
  } finally {
    db.close();
    if (previousMode === undefined) delete process.env.HEALTHTHREAD_PUBLIC_DEMO;
    else process.env.HEALTHTHREAD_PUBLIC_DEMO = previousMode;
    if (previousOrigin === undefined) delete process.env.HEALTHTHREAD_PUBLIC_ORIGIN;
    else process.env.HEALTHTHREAD_PUBLIC_ORIGIN = previousOrigin;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
