/*
  Pre-demo check: is each service actually reachable, and how much ElevenLabs
  quota is left? Worth running right before presenting, because the free tier
  burns down fast during rehearsal.

  Run with: npx tsx scripts/check-voice.ts
*/
import { readFileSync } from "node:fs";
import { quota, elevenLabsKey, voiceIdFor } from "../lib/voice/elevenlabs";
import { getProvider } from "../lib/ai/provider";

// tsx does not load .env.local the way Next does.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.log("No .env.local found — checking with the environment as-is.\n");
}

async function main() {
const provider = getProvider();

console.log("Language model");
if (provider) {
  console.log(`  configured: ${provider.name}`);
} else {
  console.log("  NOT configured — the assistant will use the rule-based parser.");
  console.log("  The demo still works end to end. This is a supported mode.");
}

console.log("\nElevenLabs");
if (!elevenLabsKey()) {
  console.log("  NOT configured — speech falls back to the browser's own voice.");
  console.log("  Speak for Me still works, but the two speakers sound less distinct.");
} else {
  console.log(`  patient voice:  ${voiceIdFor("patient")}`);
  console.log(`  clinical voice: ${voiceIdFor("clinical")}`);

  if (voiceIdFor("patient") === voiceIdFor("clinical")) {
    console.log(
      "  WARNING: both speakers use the same voice. Set ELEVENLABS_CLINICAL_VOICE_ID",
    );
    console.log("  so it is audibly clear who is talking in clinician mode.");
  }

  const q = await quota();
  if (!q) {
    console.log("  Could not read quota — the key may be invalid or the network is down.");
  } else {
    const left = q.limit - q.used;
    const pct = q.limit ? Math.round((left / q.limit) * 100) : 0;
    console.log(`  characters: ${q.used.toLocaleString()} used of ${q.limit.toLocaleString()} (${pct}% left)`);
    // A full run of the summary plus a few advocate answers is roughly 2,000.
    if (left < 2000) {
      console.log("  WARNING: probably not enough left for a full demo run.");
      console.log("  The browser-voice fallback will cover you, but rehearse it first.");
    }
  }
}

console.log("\nReminder: rehearse once with .env.local renamed, to confirm the");
console.log("deterministic parser and the browser voice carry the whole demo.\n");
}

void main();
