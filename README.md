# HealthThread

**An accessible AI health communication platform.** Patients explain what is
happening however they can — speech, text, a body map, or plain forms —
HealthThread organizes it into a health record, watches how it changes against
*their own* baseline, and helps them communicate that story to a doctor.

Built for BayHacks. PMOS, a cycle-linked condition, is the demonstration case,
not the product's identity.

---

## Run it

```bash
npm install
npm run dev -- --hostname 127.0.0.1   # open http://localhost:3000
```

HealthThread is local-only and uses a SQLite backend in `.carebridge-data`.
**Abhay — Personal** starts empty. **Alex — Demo Patient** receives the
deterministic 84-day, three-cycle synthetic history on the first Alex health
read. Every health query and write is bound to the active server session/profile;
the switcher does not filter a shared browser array.

**No API keys are required.** Every AI path has a deterministic fallback, and the
entire demo below works with no keys, no internet, and no account. Keys make it
richer:

```bash
cp .env.local.example .env.local   # then fill in what you have
npm run check-voice                # what is configured, and ElevenLabs quota
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Domain checks plus backend/API/frontend profile-isolation suites |
| `npm run check-voice` | Which services are live, plus remaining ElevenLabs quota |
| `npm run rehearse` | Walks the whole demo script against a running dev server |
| `npm run rehearse:profiles` | Destructive profile rehearsal; requires a disposable non-3000 server/database |

### Public synthetic demo

Live judge demo: **https://healththread-demo.onrender.com**

The same codebase has two server-enforced modes:

- Normal local mode keeps the existing **Abhay — Personal** and **Alex — Demo
  Patient** profiles and continues using `.carebridge-data/carebridge.sqlite`.
- Public demo mode exposes only Alex, uses temporary in-memory storage, gives
  each browser session an isolated copy of the deterministic scenario, rejects
  direct attempts to select Personal, and never enables real Fitbit or document
  uploads.

For a local preview of exactly what judges will see:

```bash
npm run build
npm run preview:public
```

Stop that preview and run the usual `npm run dev` or `npm run start` to return
to private mode. The included `render.yaml` enables public mode on Render. Render supplies
`RENDER_EXTERNAL_URL`; use `HEALTHTHREAD_PUBLIC_ORIGIN` only when deploying to a
different host or custom domain. Never deploy `.carebridge-data` or `.env.local`.

### Real Fitbit for Personal

Register this exact callback in the Google Cloud OAuth client:

```text
http://localhost:3000/api/backend/fitbit/callback
```

Then set these **server-only** values in `.env.local`:

```dotenv
GOOGLE_HEALTH_CLIENT_ID=
GOOGLE_HEALTH_CLIENT_SECRET=
CAREBRIDGE_FITBIT_REDIRECT_URI=http://localhost:3000/api/backend/fitbit/callback
```

Fitbit is only allowed for Personal. Alex always shows **Demo · Synthetic
data** and never presents a simulated connection. A missing Fitbit measurement
stays missing.

---

## The 2-3 minute demo

Rehearse this. The timings are the point — it is easy to spend ninety seconds on
the assistant and never reach the doctor conversation, which is the strongest
part.

**0:00 — The problem.** Do not open the laptop yet.

> "Healthcare assumes patients can clearly explain what is wrong. Not everyone
> can. Some people don't know the terminology, some can't speak, some are in a
> language that isn't the clinic's, and nobody remembers three months of
> symptoms in a five-minute appointment."

**0:10 — Open HealthThread.** The public link opens directly as **Alex — Demo
Patient**. Point out the persistent **Demo · Synthetic data** badge.

> "This public demonstration uses a fictional patient so the scenario is
> reproducible and no real health information is exposed. Every visitor receives
> an isolated copy."

Return to the home page. Point at **Tell HealthThread** filling the screen.

> "This is the whole interface. You don't have to know where anything belongs."

**0:20 — Talk to it.** Press **Speak instead** (or type it):

> "My lower stomach has been hurting a lot today."

HealthThread asks **how strong** it is. Say "about seven."

> "Notice it asked. It did not turn 'a lot' into a 7 — it will not invent a
> measurement I never gave it."

**0:40 — Confirm.** The **Here's what I understood** card appears: abdominal
pain, 7/10, lower abdomen, started today.

> "Nothing is saved until I say so."

Press **Yes, save this**.

**0:50 — Timeline.** Open **Timeline**. The entry is already filed, with the
original words quoted underneath.

> "I never chose a category. And my own words are kept, not replaced."

**1:05 — The change.** Open **Health Changes**. The banner is showing.

> "HealthThread noticed several things moved at once. It will not say this for one
> number — sleep alone means nothing."

**1:20 — Why.** Press **Why am I seeing this?**

Point at the table: pain, fatigue, sleep, activity, resting heart rate, each
with the patient's usual value beside the recent one.

> "This is not a second description of the reasoning. It is the same object that
> triggered the alert. The explanation cannot drift from the evidence."

**1:35 — The baseline.** Scroll to **What is normal for you**.

> "Here is the technical bit. Alex's pain is genuinely higher during the luteal
> phase every single month. A flat 30-day average says 3.9; her actual luteal
> baseline is 4.3. Comparing against the flat average would flag an ordinary
> week as a change. HealthThread compares cycle phase against cycle phase."

**1:55 — Help Me Explain.** Press it, then **Write my summary**.

> "Assembled from her own records. The AI is only allowed to reword it — if it
> adds a fact, drops a number, or says anything diagnostic, the original ships
> instead."

Edit a section or press **Don't share this** on one.

> "The patient owns this. Nothing is shared until they approve it."

Press **Approve**.

**2:15 — Speak for Me.** Press it. ElevenLabs reads the summary in the first
person while the text shows on screen.

> "For someone who is nonspeaking, this is the appointment."

**2:30 — The advocate.** Open **Show My Doctor**. Play the doctor and ask out
loud: *"When did this start?"* — it answers from the record and cites the entry.

Then ask something not recorded: *"Have you had any chest pain?"*

> "It says it isn't recorded rather than guessing. Refusing is the feature."

Tap a quick phrase — **Please slow down**.

**2:45 — Both directions.** Under *For the doctor*, say:

> "I want to rule out an ovarian cyst, so we'll order a pelvic ultrasound."

HealthThread puts it in plain words, speaks it to the patient, and saves it to the
timeline.

> "HealthThread turns the way a patient can communicate into a health story their
> doctor can understand — and turns the doctor's answer back into something the
> patient can keep."

### If something goes wrong mid-demo

- **The mic does not work.** Type instead. Every voice path has a text twin.
- **Speech is silent.** It has already fallen back to the browser voice; the
  transcript is on screen regardless.
- **The assistant seems slow.** It times out at 8 seconds and answers from the
  rule-based parser. Keep talking.
- **The data looks wrong.** The seed is deterministic. Clear site data and
  reload to get the exact same Alex back.

---

## How it works

The load-bearing decision: **the language model only ever proposes.** It never
writes to the store, never computes a baseline, and never decides something is
wrong.

```
voice / text / body map / forms
            |
      AI assistant  ---> asks for what is missing, one question at a time
            |
   "Here's what I understood"  ---> patient confirms
            |
      HealthEvent  ---> timeline, baseline, trend engine
            |
  cycle-aware baseline + multi-signal detection   (deterministic TypeScript)
            |
   "We noticed a change" -> "Why am I seeing this?"  (same evidence object)
            |
      Help Me Explain  ---> patient edits and approves
            |
   clinician view | Speak for Me | voice advocate | doctor -> patient
```

### Baselines and change detection

A metric becomes a *signal* when it is at least 1 standard deviation from the
patient's own mean for the same cycle phase **and** has moved by more than a
per-metric minimum worth mentioning, **in the direction that means worse**. The
banner requires **three concurrent signals**.

Per-metric floors rather than one percentage, because a single threshold does not
work across these measurements: resting heart rate moving 71 → 86 is large and
obvious but only 18%, while step counts swing 20% between a Tuesday and a
Saturday. See `lib/health/metrics.ts`.

### Safety

- No diagnosis, ever. Observations are phrased as deviations from the patient's
  own baseline.
- Nothing is invented. Vague words are not measurements: "it hurts a lot" makes
  the assistant ask for a number rather than assume one.
- Nothing is saved without confirmation.
- The patient's original words are never discarded, in any language.
- Every AI output is validated with Zod, and scanned by a no-diagnosis guard
  before a patient reads it.

### Architecture notes

See [AGENTS.md](AGENTS.md) for the file-by-file map, invariants, and deliberate
shortcuts.

**Not built, on purpose:** real EHR integration, Apple Health / Fitbit, caregiver
accounts, telehealth, HIPAA infrastructure, multiple conditions. One convincing
end-to-end experience instead.
