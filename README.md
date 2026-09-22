# HealthThread

HealthThread is an accessible health communication app built for the BayHacks
2026 hackathon. It helps people capture health experiences over time and
communicate that information more clearly with healthcare providers.

Patients can describe experiences through speech, text, guided questions or a
body map. HealthThread organizes patient-confirmed events into a timeline,
helps people see changes relative to their own baseline, and prepares an
editable summary for a provider conversation. It does not diagnose patients
or replace healthcare professionals.

**[Try the public synthetic demo](https://healththread-demo.onrender.com)**

## The problem and the solution

Patients may struggle to remember when a change started, describe symptoms in
clinical language, or communicate during a short appointment. HealthThread
supports multiple ways to capture a person's own account and helps organize
that account into information they can review and share.

## Core features

- Speech, text, guided check-ins and a body-map interface for health entries.
- Review and confirmation before an entry is saved; original wording is kept.
- Timeline and changes compared with the person's own past patterns.
- Editable, patient-approved summary and clinician-facing view.
- English and Spanish interface; synthetic demo patient for the public site.

## BayHacks 2026 and team

HealthThread was built for the BayHacks 2026 hackathon. PMOS, a cycle-linked
condition, is one demonstration case, not the product's identity.

| Contributor | Role | Contributions |
| --- | --- | --- |
| [Rufaida Afrin](https://github.com/rufaidaafrin) | Co-Creator, Product, Frontend & Security Engineering | Originated the HealthThread concept, developed the frontend, helped shape the product and user experience, and worked on security safeguards including a threat model, profile isolation, request protections, encrypted storage options, and security verification. |
| [Abhay Madala](https://github.com/ABHAY-MADALA) | Co-Creator, Backend & AI Development | Contributed to backend implementation, AI/LLM features, and the Fitbit integration. |

Git commit counts do not represent the complete contribution of any team member.

## Technology and architecture

The repository uses Next.js App Router, React, TypeScript and Tailwind CSS for
the web interface; Three.js and React Three Fiber for the body interface;
SQLite via better-sqlite3 for local profile-scoped records; and Zod to validate
structured outputs. The confirmation flow connects patient input to saved
events, timelines, baseline comparisons and patient-approved summaries. The
public deployment uses synthetic data and an in-memory demo backend.

## Screenshots and demo

The [live synthetic demo](https://healththread-demo.onrender.com) shows the
interface. Repository assets include light and dark HealthThread logos in
`public/brand/`; no application screenshots are currently included.

---

## Run it

```bash
npm install
npm run dev -- --hostname 127.0.0.1   # open http://localhost:3000
```

Local development uses a SQLite backend in `.carebridge-data`.
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

### Guided symptom histories

Guided Check-In includes dedicated one-question-at-a-time paths for period or
bleeding history, bladder or urination changes, bowel movements, and ongoing
conditions or treatments. The ongoing-care path branches into tailored prompts
for heart/circulation, breathing/lung conditions, diabetes/blood sugar, cancer
care, hormones/PCOS, joints/mobility, memory/balance/vision/hearing, kidney/fluid
changes, or another condition. It supports the major chronic-disease groups
seen worldwide and common needs of adults over 50 without turning the first
screen into a long diagnosis list.

The forms capture concrete details such as onset, associated changes, effect on
the person's usual day, relevant treatment or routine context, optional device
measurements, and the patient's own note. Patients review the complete entry
before confirming it. HealthThread also makes clear that it does not monitor
emergencies.

These questions organize details that can help a clinician understand the
history; they do not narrow, suggest, or name a diagnosis. English and Spanish
use the same structured fields, while the patient's selected wording remains in
the record.

### Safety

- No diagnosis, ever. Observations are phrased as deviations from the patient's
  own baseline.
- Nothing is invented. Vague words are not measurements: "it hurts a lot" makes
  the assistant ask for a number rather than assume one.
- Nothing is saved without confirmation.
- The patient's original words are never discarded, in any language.
- Every AI output is validated with Zod, and scanned by a no-diagnosis guard
  before a patient reads it.

### Security engineering

HealthThread treats profile isolation, consent and public-demo separation as
enforced boundaries rather than presentation labels. The application includes
same-origin/CSRF checks, server-bound profile contexts, PKCE OAuth replay
protection, endpoint rate limits, security headers, optional AES-256-GCM storage
encryption, PHI-free hash-chained audit records, upload signature inspection and
automated attack tests. The public deployment exposes synthetic Alex only and
cannot access Personal, document uploads or real OAuth.

This is still a prototype, not a HIPAA-compliant clinical service. Production
Personal mode requires the identity-aware proxy, encryption and audit secrets
described in [the threat model](docs/security-threat-model.md). See
[SECURITY.md](SECURITY.md) for supported boundaries and
[the security demo](docs/security-demo.md) for reproducible checks.

### Architecture notes

See [AGENTS.md](AGENTS.md) for the file-by-file map, invariants, and deliberate
shortcuts.

**Not built, on purpose:** real EHR integration, Apple Health, caregiver
accounts, telehealth, or production HIPAA infrastructure. Condition-friendly
check-ins organize patient-reported changes; they are not disease-management or
diagnostic tools.
