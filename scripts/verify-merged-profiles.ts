import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { BackendDatabase } from "../lib/backend/database";
import { handleBackend } from "../lib/backend/http";

async function main() {
  const db = new BackendDatabase(":memory:");
  let cookie = "", context = "";
  const file = { id: randomUUID(), name: "test-only.json", data: Buffer.from('{"fixture":true}').toString("base64") };
  async function call(path: string, input?: unknown, expected = 200, suppliedContext = context) {
    const response = await handleBackend(new Request(`http://localhost:3101/api/backend/${path}`, {
      method: input === undefined ? "GET" : "POST",
      headers: { cookie, "x-carebridge-context": suppliedContext, "x-carebridge-request": "1", "content-type": "application/json" },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }), path.split("?")[0].split("/"), db);
    assert.equal(response.status, expected, path);
    assert.equal(response.headers.get("cache-control"), "no-store");
    if (response.headers.has("set-cookie")) cookie = response.headers.get("set-cookie")!.split(";")[0];
    return response.json();
  }
  try {
    for (const [host, origin, expected] of [
      ["127.0.0.1:3101", "http://127.0.0.1:3101", 201],
      ["localhost:3101", "http://localhost:3101", 201],
      ["evil.example:3101", "http://evil.example:3101", 403],
      ["127.0.0.1:3101", "http://evil.example:3101", 403],
      ["127.0.0.1:3102", "http://127.0.0.1:3102", 403],
    ] as const) {
      const response = await handleBackend(new Request("http://localhost:3101/api/backend/session", {
        method: "POST", headers: { host, origin, "x-carebridge-request": "1" },
      }), ["session"], db);
      assert.equal(response.status, expected, `Host/Origin boundary: ${host} ${origin}`);
    }
    await call("documents", undefined, 401);
    context = (await call("session", {}, 201)).context;
    assert.equal((await call("documents")).documents.length, 0);
    await call("documents", { files: [file] }, 400);
    await call("documents", { confirmed: true, userId: "alex-demo", files: [file] }, 400);
    const before = await call("events");
    const saved = await call("documents", { confirmed: true, files: [file] });
    assert.equal(saved.documents[0].userId, "personal");
    assert.equal(saved.documents[0].size, Buffer.from(file.data, "base64").length);
    assert.equal((await call(`documents/file?id=${file.id}`)).data, file.data);
    assert.deepEqual(await call("events"), before, "Uploading cannot create health facts");
    assert.deepEqual(await call("documents", { confirmed: true, files: [file] }), saved, "Retry is idempotent");
    const extra = { ...file, id: randomUUID(), name: "extra.json" };
    await call("documents", { confirmed: true, files: [extra, { ...file, name: "changed.json" }] }, 409);
    assert.deepEqual((await call("documents")).documents, saved.documents, "Conflicting batch rolls back entirely");
    await call("documents", { confirmed: true, files: [{ ...extra, name: "script.html" }] }, 400);
    await call("documents", { confirmed: true, files: [{ ...extra, name: "../path.json" }] }, 400);
    await call("documents", { confirmed: true, files: [{ ...extra, data: "not base64" }] }, 400);
    const oldContext = context;
    context = (await call("profile", { userId: "alex-demo" })).context;
    assert.equal((await call("documents")).documents.length, 0);
    await call(`documents/file?id=${file.id}`, undefined, 404);
    await call("documents", { confirmed: true, files: [extra] }, 403);
    await call("documents", { confirmed: true, files: [extra] }, 409, oldContext);
    await call("demo/reset", { confirmed: true });
    context = (await call("profile", { userId: "personal" })).context;
    assert.equal((await call(`documents/file?id=${file.id}`)).data, file.data);
    console.log("PASS document API: confirmation, ownership, unchanged bytes, no health-fact creation, idempotency, rollback, validation, stale writes, demo reset isolation");
  } finally { db.close(); }

  const source = (path: string) => readFileSync(path, "utf8");
  assert.match(source("components/TopNav.tsx"), /ProfileSwitcher/);
  assert.match(source("components/TopNav.tsx"), /DemoIndicator/);
  assert.doesNotMatch(source("components/TopNav.tsx"), /aria-label="Alex"|<strong>Alex/);
  assert.match(source("app/my-health/page.tsx"), /ProfileControls/);
  assert.match(source("app/my-health/page.tsx"), /Building your baseline/);
  assert.match(source("components/health/HealthHistory.tsx"), /DailyRow/);
  assert.match(source("components/records/RecordUploader.tsx"), /expectedContext: context, signal/);
  assert.doesNotMatch(source("lib/records/documentStore.ts"), /indexedDB\.open/);
  assert.match(source("components/profile/ProfileProvider.tsx"), /Fragment key=\{value.context\}/);
  assert.match(source("components/voice/useVoiceInput.ts"), /transcription.current\?\.abort/);
  assert.match(source("components/ui/CollapsibleSection.tsx"), /hashchange/);
  assert.match(source("app/body-picture/page.tsx"), /disabled=\{!canReview \|\| voice.recording \|\| voice.transcribing\}/);
  const explain = source("app/explain/page.tsx");
  assert.match(explain, /const hasSummarySourceData = events\.length > 0 \|\| metrics\.length > 0/);
  assert.match(explain, /!hasSummarySourceData/);
  assert.match(explain, /await generateSummary\(\)/);
  assert.match(explain, /await saveSummary\(approved\)/);
  assert.match(explain, /const approvedText = await getApprovedSpeech\(\)/);
  assert.match(explain, /getApprovedSpeech\(\)\.then\(\(text\) => speech\.speak\(text\)\)/);
  assert.doesNotMatch(explain, /summaryToText|buildSummary|fetch\("\/api\/summary/);
  assert.match(explain, /calmMode=\{calmMode\}/);
  assert.match(explain, /CalmDetails title=\{t\("explain\.speakingOptions"\)\}/);
  assert.match(source("components/explain/SummaryEditor.tsx"), /!calmMode \|\| showControls \|\| editingId !== null/);
  assert.match(source("components/Chrome.tsx"), /calm-view-strip/);
  assert.match(source("components/Chrome.tsx"), /ProfileSwitcher/);
  assert.match(source("app/layout.tsx"), /title: "HealthThread"/);
  assert.match(source("app/layout.tsx"), /<ProfileProvider>/);
  assert.match(source("components/TopNav.tsx"), /aria-label="HealthThread home"/);
  console.log("PASS merged UI contracts: navigation/profile integration, baseline state, wearable-only history, upload context, voice cleanup, deep links");
  console.log("PASS HealthThread/Calm View merge: branding and calm controls retain backend summary generation, approval and speech, and real profiles");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
