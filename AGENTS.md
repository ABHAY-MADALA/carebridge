# CareBridge — agent handoff

**Read this first.** It is the context contract for whoever works on this next: a
teammate, a future session, or another AI. It is updated at the end of every task,
so it should be accurate at whatever moment the previous session ended.

`CLAUDE.md` points here. Do not maintain a second copy.

---

## What CareBridge is

Healthcare expects patients to know what information matters, how to describe it,
and where to enter it. Many people can't: they lack the terminology, can't describe
a symptom, are nonspeaking, face a language barrier, aren't comfortable with
technology, or simply can't remember three months of history in a five-minute
appointment.

CareBridge lets a patient communicate however they can — speech, text, a body map,
or plain forms — converts that into structured health events, builds a timeline,
compares recent data against **that person's own** past patterns, and then helps
them communicate the result to a doctor: an editable summary, a clinician view, and
a voice that speaks for them and answers the doctor's questions out loud.

Built for BayHacks. PMOS (a cycle-linked condition) is the demonstration case,
not the product's identity.

### Non-negotiables

These are product requirements, not preferences. Do not relax them.

1. **Never diagnose.** No condition names, no causes, no "this means you have".
   Observations are always phrased as deviations from the patient's own baseline.
2. **Never invent unrecorded information.** If a value is missing, ask for it or
   say it isn't recorded. This applies hardest in `/api/ask`, where the AI answers
   a doctor out loud.
3. **Never save without confirmation.** The assistant proposes; the patient
   confirms; only then does anything reach the store.
4. **Never discard the patient's original words.** Every event keeps
   `originalInput` and its language, even when translated or rephrased.
5. **Never let the demo depend on a network call.** Every AI path has a
   deterministic fallback.

---

## Status board

All tasks complete. The app builds, typechecks, and `npm run verify` passes.

| # | Task | Status |
|---|------|--------|
| 1 | Scaffold Next.js + TS + Tailwind, deps, git, env example | done |
| 2 | This handoff file | done |
| 3 | `lib/schema.ts` + repository (interface + localStorage) | done |
| 4 | `lib/store/seed.ts` — Alex's deterministic history | done |
| 5 | Baseline + multi-signal trend engine | done |
| 6 | AI assistant (provider adapter, prompts, fallback, `/api/assistant`) | done |
| 7 | ElevenLabs voice layer (`/api/speech`, `/api/transcribe`, `/api/voice-status`) | done |
| 8 | Home — "Tell CareBridge" | done |
| 9 | Manual check-in + body map | done |
| 10 | `/timeline` | done |
| 11 | `/insights` — change banner, why, charts, phase comparison | done |
| 12 | `/explain` — Help Me Explain | done |
| 13 | `/clinician` | done |
| 14 | Voice advocate — grounded Q&A + quick phrases | done |
| 15 | Doctor's side — read-to-me + `/api/explain-back` | done |
| 16 | Polish — help tips, tutorial, accessibility bar, README | done |
| 17 | Verification scripts and pre-demo checks | done |

**Nothing is in progress.** Sensible next steps, in order of value:

1. **Rehearse without keys, then with them.** The one thing a machine cannot
   check. See the demo script in `README.md`.
2. **English → patient-language summary.** Input translation works (Spanish in,
   English preserved alongside the original). The reverse — reading the finished
   summary back in Spanish — only works when an LLM key is present; there is no
   offline path. See "Known limits".
3. **Supabase.** Implement `Repository` and change one line in
   `lib/store/index.ts`.

---

## Architecture map

```
app/
  layout.tsx              Settings + health-data providers, a11y bar, nav, no-flash script
  globals.css             Design tokens and the data-* driven accessibility theming
  page.tsx                Home. Tell CareBridge is the primary surface
  timeline/page.tsx       Day-grouped record with the patient's quoted words
  insights/page.tsx       Change banner, why-panel, charts, cycle-phase comparison
  explain/page.tsx        Generate / edit / approve / Speak for Me
  clinician/page.tsx      Chrome-free approved summary + advocate + doctor tools
  api/
    assistant/            Free text -> one follow-up question, or drafts to confirm
    speech/               ElevenLabs TTS, streamed. 204 means "browser, you speak"
    transcribe/           ElevenLabs Scribe STT. 204 means "browser, you listen"
    voice-status/         Booleans only: is ElevenLabs live, is an LLM live
    summary/              Rewords an already-built summary. Never a source of facts
    ask/                  Doctor's question -> answer grounded in stored events only
    explain-back/         Doctor's words -> plain language for the patient
    translate/            Patient's language -> English, additively
components/
  SiteNav.tsx             Icons plus words, never icons alone
  HelpTip.tsx             The circled i. Copy lives in HELP_TEXT here
  a11y/                   SettingsProvider (text size, contrast, motion, language) + bar
  assistant/              AssistantPanel (the centrepiece) + ConfirmationCard
  manual/                 ManualEntry, BodyMap, SeverityScale — the no-AI path
  health/useHealthData.tsx  One shared read of the record; recomputes baseline + trends
  insights/               ChangeBanner, WhyAmISeeingThis, MetricChart
  explain/SummaryEditor   Per-section edit and include/exclude
  clinician/              VoiceAdvocate, QuickPhrases, DoctorSpeaks
  voice/                  useVoiceInput (mic), useSpeaker (speech + on-screen transcript)
  onboarding/Tutorial     Three screens, then out of the way
lib/
  schema.ts               The single internal language. Every type is a Zod schema
  dates.ts                Local-time day keys and relative phrasing
  utils.ts                cn()
  ai/
    provider.ts           LLM adapter (OpenAI / Anthropic / Gemini) + completeJson
    prompts.ts            System prompts. SAFETY_RULES is shared by all of them
    fallback.ts           The deterministic assistant. Carries the demo with no key
    assistant.ts          Orchestration: model, validate, guard, or fall back
    guards.ts             No-diagnosis scan (+ disclaimer exemptions)
    grounded.ts           Doctor Q&A, answered only from the record
    summarize.ts          Optional rewording pass, heavily constrained
    explainBack.ts        Doctor -> patient plain language (+ offline glossary)
    translate.ts          Patient language -> English (+ offline phrase table)
  health/
    metrics.ts            Labels, formatters, adverse direction, per-metric floors
    baseline.ts           Cycle-phase-aware baselines
    trends.ts             Multi-signal detection. MIN_SIGNALS lives here
    summary.ts            Builds the doctor summary from the record
    categories.ts         Patient-facing category names, emoji, severity words
    createEvent.ts        The one place a draft becomes a HealthEvent
  store/
    repository.ts         The interface the whole app talks to
    localRepository.ts    localStorage implementation + STORE_EVENT
    index.ts              Chooses the backend. Swap here for Supabase
    ensureSeed.ts         Seeds Alex once
    seed.ts               Alex's deterministic history
scripts/
  verify-engine.ts        Seed, baselines, detection thresholds
  verify-fallback.ts      The deterministic parser, including the demo dialogue
  verify-guards.ts        No-diagnosis guard, both directions
  verify-advocate.ts      Grounded answers, refusals, citations, summary safety
  check-voice.ts          What is configured + ElevenLabs quota
```

## Invariants a newcomer would otherwise break

- **The LLM only ever proposes.** It never writes to the store, never computes a
  baseline, and never decides something is wrong.
- **Baselines and trend detection are deterministic TypeScript** and must stay
  that way. They are the part of the product that is defensible; an LLM guessing
  at trends would destroy that.
- **All provider calls live in route handlers.** No API key may reach the browser.
- **Every AI output is validated with Zod** before anything downstream sees it.
  A validation failure is a fallback trigger, not an error to surface.
- **Every AI path has a keyless fallback**, and the LLM and ElevenLabs fail
  independently: if the model is down, ElevenLabs still speaks the fallback text.
- **The change banner requires at least `MIN_SIGNALS` (3) concurrent signals.**
  One metric moving never triggers it.
- **`WhyAmISeeingThis` renders the same `TrendDetection` object that triggered the
  banner.** Do not compute a second explanation; the explanation cannot be
  allowed to drift from the evidence.
- **Vague words are not measurements.** `extractSeverity` deliberately refuses
  "a lot" and "really bad". If you make it guess, you have broken rule 2.
- **Accessibility is driven by `data-*` attributes on `<html>`** plus CSS
  variables. Components should not read settings in order to style themselves.
- **204 from a voice route is a normal outcome**, meaning "the browser should do
  this itself". Do not convert it to an error.
- **The no-diagnosis guard is not applied to `/api/explain-back`.** There the
  model relays what a doctor said, and a doctor may name a condition.

## Environment variables

Everything is optional; see `.env.local.example`. What degrades without each:

| Variable | Missing means |
|---|---|
| `LLM_PROVIDER` + matching key | Assistant uses the rule-based parser; summaries use the deterministic builder; doctor Q&A uses the keyword matcher. Full demo still works. |
| `ELEVENLABS_API_KEY` | Speech falls back to browser `SpeechSynthesis`; voice input falls back to `SpeechRecognition` (Chrome only). |
| `ELEVENLABS_VOICE_ID` | A default voice is used. |
| `ELEVENLABS_CLINICAL_VOICE_ID` | Doctor-facing playback reuses the patient voice, and the two speakers stop being audibly distinct. `npm run check-voice` warns about this. |

## How to run

```bash
npm install
cp .env.local.example .env.local   # optional
npm run dev                        # http://localhost:3000
npm run verify && npm run typecheck && npm run build   # before committing
```

## Deliberate shortcuts — do not "fix" these

- **No database and no auth.** Data lives in `localStorage` behind the
  `Repository` interface. Intentional for demo reliability.
- **One seeded patient (Alex).** No multi-user concept exists.
- **`/api/ask` receives the record in the request body.** A consequence of
  local-first storage. When a database exists, the route should read the record
  itself and the client should send only the question.
- **The history is 84 days, not the 30 the brief suggested.** A cycle-aware
  baseline needs more than one cycle to compare a phase against itself; 30 days
  yields an `n` of about 2 for the current phase. The timeline emphasises recent
  days; the older ones exist so the baseline is honest.
- **Per-metric change floors instead of a flat 15%.** A single percentage
  threshold missed the resting-heart-rate signal entirely (71 → 82 is only 13%).
  See the comment in `lib/health/metrics.ts`.
- **`npm audit` reports a moderate transitive postcss advisory** inside Next's
  own dependencies. Fixing it needs a major Next bump; it is dev-only.

## Known limits

- **Summary translation is one-way offline.** Spanish in works without a key
  (`lib/ai/translate.ts` has a phrase table). Reading the finished English
  summary back in Spanish needs an LLM key; there is no offline en → es path.
- **Voice input needs HTTPS or localhost** for `getUserMedia`, plus a one-time
  browser permission prompt. Grant it before demoing. Typing is an equal path.
- **`prefers-reduced-motion` is honoured**, but Low Stimulation is also a manual
  toggle because the OS setting is often unset on a borrowed laptop.

## Demo script

See `README.md`. It defines what must not regress.
