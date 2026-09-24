import assert from "node:assert/strict";
import { parseAIArchive } from "../lib/ai/importArchive";
import { BackendDatabase } from "../lib/backend/database";
import { ProfileStore } from "../lib/backend/store";
import { BackendError } from "../lib/backend/schema";

const chatgpt = parseAIArchive("chatgpt-conversations.json", JSON.stringify([{
  title: "Knee question",
  mapping: {
    user: { message: { author: { role: "user" }, create_time: 1_725_000_000, content: { parts: ["My right knee hurts 6/10 since yesterday."] } } },
    assistant: { message: { author: { role: "assistant" }, create_time: 1_725_000_001, content: { parts: ["This could be a diagnosis that must never be imported as a patient fact."] } } },
  },
}]));
assert.equal(chatgpt.messagesScanned, 1);
assert.equal(chatgpt.candidates.length, 1);
assert.equal(chatgpt.candidates[0].provider, "chatgpt");
assert.equal(chatgpt.candidates[0].conversationTitle, "Knee question");
assert.equal(chatgpt.candidates[0].drafts[0].bodyLocation, "Right knee");
assert.equal(chatgpt.candidates[0].drafts[0].severity, 6);
assert.equal(chatgpt.candidates[0].drafts[0].originalInput, "My right knee hurts 6/10 since yesterday.");

const claude = parseAIArchive("claude-export.json", JSON.stringify([{
  name: "Sleep",
  chat_messages: [
    { sender: "human", text: "I slept 4 hours last night and feel exhausted.", created_at: "2026-09-18T08:00:00.000Z" },
    { sender: "assistant", text: "Assistant guidance should not be imported." },
  ],
}]), "claude");
assert.equal(claude.messagesScanned, 1);
assert.equal(claude.candidates.length, 1);
assert.ok(claude.candidates[0].drafts.some((draft) => draft.category === "sleep"));

const gemini = parseAIArchive("Gemini Apps Activity.json", JSON.stringify({
  activity: [
    { prompt: "I have a new rash on my arm.", timestamp: "2026-09-19T12:00:00.000Z", response: "Untrusted model output" },
    { prompt: "Help me write a grocery list.", timestamp: "2026-09-19T12:10:00.000Z" },
  ],
}), "gemini");
assert.equal(gemini.messagesScanned, 2);
assert.equal(gemini.candidates.length, 1);
assert.equal(gemini.candidates[0].drafts[0].category, "other");
assert.equal(gemini.candidates[0].drafts[0].label, "Health note");

const textExport = parseAIArchive("conversation.txt", [
  "User: My left ear hurts 5/10 since today.",
  "Assistant: This is not a patient statement.",
  "User: Tell me a joke.",
].join("\n"), "other");
assert.equal(textExport.messagesScanned, 2);
assert.equal(textExport.candidates.length, 1);
assert.equal(textExport.candidates[0].drafts[0].bodyLocation, "Left ear");

const hostileHtml = parseAIArchive("chatgpt-export.html", [
  "<section>User: My right ankle hurts 7/10 today.</section>",
  "<script>document.write('User: I have a fever.')</script >",
  "<style>.hidden::after { content: 'User: I have a migraine.'; }</style >",
  "<template>User: I have nausea.</template>",
  "<section>Assistant: This diagnosis must not be imported.</section>",
].join(""), "chatgpt");
assert.equal(hostileHtml.messagesScanned, 1);
assert.equal(hostileHtml.candidates.length, 1);
assert.equal(hostileHtml.candidates[0].drafts[0].severity, 7);
assert.match(hostileHtml.candidates[0].originalText, /right ankle hurts/i);
assert.doesNotMatch(hostileHtml.candidates[0].originalText, /fever|migraine|nausea|diagnosis/i);

const encodedHtml = parseAIArchive(
  "claude-export.html",
  "<p>Human: My head hurts &amp;lt;script&amp;gt;not markup&amp;lt;/script&amp;gt;</p>",
  "claude",
);
assert.equal(encodedHtml.messagesScanned, 1);
assert.equal(encodedHtml.candidates.length, 1);
assert.match(encodedHtml.candidates[0].originalText, /&lt;script&gt;not markup&lt;\/script&gt;/);
assert.doesNotMatch(encodedHtml.candidates[0].originalText, /<script>/i);

const malformedHtml = parseAIArchive(
  "gemini-export.html",
  "<div><strong>User:</strong> My left shoulder is sore.<br>It started yesterday.<div>",
  "gemini",
);
assert.equal(malformedHtml.messagesScanned, 1);
assert.equal(malformedHtml.candidates.length, 1);
assert.match(malformedHtml.candidates[0].originalText, /left shoulder is sore/i);

assert.throws(() => parseAIArchive("bad.json", "{"), /invalid-json/);

const db = new BackendDatabase(":memory:");
try {
  const personal = new ProfileStore(db, "personal");
  const first = personal.stageAIInbox(chatgpt.candidates, true);
  assert.equal(first.added, 1);
  assert.equal(first.skipped, 0);
  assert.equal(personal.aiInbox().length, 1);
  const duplicate = personal.stageAIInbox(chatgpt.candidates, true);
  assert.equal(duplicate.added, 0);
  assert.equal(duplicate.skipped, 1);

  const pendingId = personal.aiInbox()[0].id;
  const saved = db.transaction(() => personal.confirmAIInbox([pendingId], true));
  assert.equal(saved.candidates, 1);
  assert.equal(saved.events.length, 1);
  assert.equal(personal.aiInbox().length, 0);
  assert.equal(personal.events()[0].userId, "personal");
  assert.equal(personal.events()[0].synthetic, false);
  assert.equal(personal.events()[0].originalInput, "My right knee hurts 6/10 since yesterday.");
  assert.match(personal.events()[0].note ?? "", /Imported from ChatGPT/);
  assert.equal(personal.stageAIInbox(chatgpt.candidates, true).skipped, 1);

  const alex = new ProfileStore(db, "alex-demo");
  alex.ensureDemo();
  assert.equal(alex.aiInbox().length, 3);
  assert.ok(alex.aiInbox().every((candidate) => candidate.synthetic));
  assert.throws(
    () => alex.stageAIInbox(chatgpt.candidates, true),
    (error) => error instanceof BackendError && error.code === "ai-import-personal-only",
  );
  alex.dismissAIInbox([alex.aiInbox()[0].id], true);
  assert.equal(alex.aiInbox().length, 2);
  alex.resetDemoAIInbox(true);
  assert.equal(alex.aiInbox().length, 3);
  assert.equal(personal.aiInbox().length, 0);
} finally {
  db.close();
}

console.log("AI conversation import verification passed.");
