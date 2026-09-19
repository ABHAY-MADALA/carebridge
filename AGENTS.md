# HealthThread — agent handoff

**Read this first.** It is the context contract for whoever works on this next: a
teammate, a future session, or another AI. It is updated at the end of every task,
so it should be accurate at whatever moment the previous session ended.

`CLAUDE.md` points here. Do not maintain a second copy.

---

## What HealthThread is

Healthcare expects patients to know what information matters, how to describe it,
and where to enter it. Many people can't: they lack the terminology, can't describe
a symptom, are nonspeaking, face a language barrier, aren't comfortable with
technology, or simply can't remember three months of history in a five-minute
appointment.

HealthThread lets a patient communicate however they can — speech, text, a body map,
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

### Profile-scoped AI conversation inbox (September 19, 2026)

My Health now includes an AI conversation inbox inside Connected health data.
Abhay Personal can locally parse JSON, HTML and TXT exports from ChatGPT, Claude,
Gemini or another AI; only user-authored, health-like messages become proposed
items. Provider replies never become patient facts. Imported wording, provider,
conversation title and available timestamp are preserved, duplicates stay handled,
and nothing becomes a HealthEvent until a second explicit review/confirmation.

Alex has three deterministic fictional examples (ChatGPT, Claude and Gemini), a
visible demo label and a restore-inbox action. Existing Alex databases gain only
the new synthetic inbox without re-seeding or re-dating health history. Pending
items and handled fingerprints are backend/profile scoped. Confirmed events retain
source provenance in their note; missing details remain null. The local UI is
honest that continuous MCP/OAuth capture still requires production authentication,
encrypted hosted storage and a public connector service.

Automated coverage verifies provider export parsing, exclusion of assistant text,
generic health-note fallback without invented facts, duplicate suppression,
Personal/Alex isolation and confirmation. All verification suites, typecheck and
the production build pass. Live UI QA covered Alex selection through the final
confirmation screen without saving, Personal archive controls, dark mode and Large
text. The refreshed build runs at `127.0.0.1:3000`. Changes are intentionally
uncommitted and unpushed pending user review.

### Body Picture theme-control cleanup (September 19, 2026)

Removed the duplicate page-level Light/Dark mode button from Body Picture. The
single app-wide theme control remains in the header account area, so the page no
longer presents a second theme action beside its title. All verification suites,
typecheck, and the production build pass.

### Synced Personal/Alex profiles on Windows (September 19, 2026)

Fast-forwarded local `main` to GitHub commit `6ae859e`, which includes the
profile-scoped backend and HealthThread rename. The app now exposes **Abhay —
Personal** and **Alex — Demo Patient** through the real profile switcher. A live
local API check confirmed that Abhay is Fitbit-eligible, Alex retains 84
synthetic daily records and 12 events, and Alex cannot connect a real Fitbit.

This Windows host runs Node 22.12 without the optional `node:sqlite` builtin, so
the database adapter now uses `better-sqlite3` 12.4.1 with the same synchronous,
profile-scoped SQL contract and transaction boundaries. All nine verification
suites, typecheck, and the production build pass, and the refreshed build is
running on `127.0.0.1:3000`. This checkout has no `.env.local` or copied OAuth
tokens/patient records, so Abhay correctly shows Fitbit setup required here;
GitHub commits do not transfer private Fitbit authorization or health data. The
pre-sync wording changes remain preserved in `stash@{0}`. Do not push without
user authorization.

### HealthThread branding / Calm View merge (September 19, 2026)

Merged incoming `3e3a8c9` (HealthThread branding) and `4a18ff9` (Calm View)
with the complete local backend/profile integration and Fitbit fix `9d15a49`.
The Explain conflict retains the incoming disclosure controls, quotes and speed
options, while summary generation, approval prewarming and Speak for Me continue
using the profile-scoped backend. The layout and both navigation/clinician headers
retain real profile controls alongside the new branding and calm-mode strip.
Regression assertions cover these combined contracts. Local-only implementation
files and incoming-only UI files were checked for accidental overwrites.
The user authorized merging and pushing the combined main branch to GitHub;
public deployment remains out of scope. Pre-merge local work is preserved at
`backup/pre-healththread-merge-9d15a49`. Credentials, patient records, and the
unrelated untracked `.cursor/` directory are excluded from the commit.
Verification: all nine suites, typecheck, production build and six HTTP route
smoke checks passed. The merged build is running locally on port 3000. Browser
interaction was limited by the existing migration-review gate; its ownership
choices were left untouched, not bypassed for testing.

### Live Fitbit import correction (September 19, 2026)

Personal Google authorization and resting-heart-rate sync now work. The live
provider rejected the old step page size and some month-long rollups; steps now
use contiguous seven-day query ranges with independent pagination and page size
seven. A failed chunk discards partial results for that metric. Live sleep sessions
omitted `civilEndTime`; the importer now derives the patient's wake-up date from
`endTime` and explicit `endUtcOffset`, preserving civil dates when supplied and
refusing to guess missing offsets. Daily sleep still aggregates unique sessions.
No frontend changes or automatic patient-data writes were made. Read-only live
adapter checks returned steps, sleep and resting HR with no unavailable types.
The user must click Sync now to import the corrected results. Regression coverage
includes civil/UTC/offset boundaries, invalid timing, duplicate sleep sessions,
cross-year step chunks, per-chunk pagination, failed chunks, auth and page limits.
All nine verification suites (including 17 API/OAuth groups), standalone typecheck,
production build and diff whitespace checks passed. The updated production build
was restarted on loopback port 3000. The backend fix was committed as `9d15a49`;
the subsequent GitHub merge/push is described above. No public deployment.

### Integrated GitHub UI and local profiles (September 19, 2026)

Merged the navigation/records/body-capture updates through `3fad75d` with the
local Personal/Alex backend cutover. TopNav now uses the real profile switcher;
the old Sidebar/MobileNav are removed. My Health keeps the new combined layout
and the backend timeline (including wearable-only days), baseline-building
state, Fitbit controls, AI privacy and confirmed Alex reset. Timeline/Insights
redirects open the corresponding disclosure sections.

Record uploads now use profile-scoped SQLite document APIs, not global IndexedDB.
Uploads are Personal-only (Alex stays synthetic-only), explicitly confirmed,
atomic and idempotent. Original bytes are preserved; no health facts or AI context
are derived from documents. Limits: 15 MB/file, 30 MB/batch, 20 files/batch.
Downloads are attachments. Existing unowned browser files remain untouched and
are not silently assigned to either profile. HIE/FHIR remains setup-only.

Profile context is rechecked after asynchronous file reads and JSON decoding;
profile UI remounts on context changes and microphone/transcription work is
cancelled on unmount. Body review waits until recording/transcription finishes.
Both validated localhost and 127.0.0.1 Host/Origin pairs work with Next's normalized
request URLs; non-loopback hosts and mismatched origins remain rejected.

Verification includes the nine `npm run verify` suites, typecheck, production
build, disposable HTTP rehearsals, and desktop/mobile profile/history/records
browser checks. Real wearable authorization and actual microphone audio remain
unverified. No live patient records were used for test writes. Do not push or
deploy without user authorization.

### Two-profile backend + frontend cutover (September 19, 2026)

`lib/backend/*` and `app/api/backend/[...path]/route.ts` provide local SQLite,
two controlled sessions/profiles, user-bound queries, Personal-only OAuth/sync,
scoped deterministic baseline/trends/summary/AI, and confirmed synthetic
import/reset. The frontend now uses that backend exclusively for health data.
Read `docs/backend-profiles.md` for the contract and security boundary.

**Abhay — Personal** starts empty. **Alex — Demo Patient** gets the existing
84-day deterministic synthetic history and displays a persistent
`Demo · Synthetic data` indicator. Profile switching aborts old requests,
rejects mismatched response contexts, unmounts profile UI state, stops speech,
clears audio blobs and assistant handoff state, and then loads the new backend
context. Old localStorage health data is read only by a one-time review gate;
ambiguous records are never assigned automatically.

The legacy local repository/client Fitbit merge modules were removed. Legacy
unscoped `/api/assistant`, `/api/ask`, `/api/summary` and `/api/fitbit/*` paths
return HTTP 410. All screens write through `/api/backend/*`.

Verification passed: typecheck, production build, five domain/UI suites, 20
backend isolation groups, 14 API/OAuth groups, 7 frontend boundary groups, the
integrated port-3000 rehearsal, and the disposable port-3101 profile rehearsal.
The production server is running on `127.0.0.1:3000`.

| # | Task | Status |
|---|------|--------|
| 1 | Scaffold Next.js + TS + Tailwind, deps, git, env example | done |
| 2 | This handoff file | done |
| 3 | `lib/schema.ts` + repository (interface + localStorage) | done |
| 4 | `lib/store/seed.ts` — Alex's deterministic history | done |
| 5 | Baseline + multi-signal trend engine | done |
| 6 | AI assistant (provider adapter, prompts, fallback, `/api/assistant`) | done |
| 7 | ElevenLabs voice layer (`/api/speech`, `/api/transcribe`, `/api/voice-status`) | done |
| 8 | Home — "Tell HealthThread" | done |
| 9 | Manual check-in + body map | done |
| 10 | `/timeline` | done |
| 11 | `/insights` — change banner, why, charts, phase comparison | done |
| 12 | `/explain` — Help Me Explain | done |
| 13 | `/clinician` | done |
| 14 | Voice advocate — grounded Q&A + quick phrases | done |
| 15 | Doctor's side — read-to-me + `/api/explain-back` | done |
| 16 | Polish — help tips, tutorial, accessibility bar, README | done |
| 17 | Verification scripts and pre-demo checks | done |

| 18 | Fitbit via Google Health API, full Spanish i18n, real Low Stimulation density, generic Read Aloud, inline pain widgets in the assistant, one voice everywhere, button audit | done |
| 19 | Full visual redesign (design tokens, Inter, left-sidebar shell) + Body Picture, a new interactive 3D body-region picker | done |
| 20 | Reference-led charcoal/sand UI, persisted light/dark toggle, original interactive front/back SVG anatomy, compact symptom panel | done |
| 21 | Realistic local CC0 human mesh, reference-style 3D workspace, surface pain glow, four camera presets, zoom/expand, dark/light materials | done |
| 22 | Focused demo-readiness fixes: onset provenance, calm measurements, consistent navigation, guided icons, single body action, confirmed Timeline removal, loading/retry, Timer compatibility | done |
| 23 | Backend-owned Personal/Alex profiles, frontend cutover, migration review, scoped Fitbit/AI/summary/timeline, isolation tests | done |
| 23 | UI cleanup: horizontal top navigation, merged My Health record/pattern view, disclosure sections, grouped account settings, inline navigation help | done |
| 24 | Persistent grouped side navigation, full help read-aloud, polished dark theme, local records upload, and consented HIE/FHIR connection surface | done |


### Latest UI revision (September 19, 2026)

The current cleanup keeps navigation continuously visible in a sticky right-side
rail at desktop widths and uses a compact top menu only when the viewport cannot
fit both content and rail. Eight destinations read as five choices: Home; Add
health info (Tell, Body Picture, Guided Check-In); My Health; Health Records; and
Doctor visit (Help Me Explain, Show My Doctor). Theme, accessibility settings, and
the Alex profile chip stay grouped in the header. Every main choice has an English
and Spanish info control; `ReadAloud` prefers each control's full
`data-read-aloud-text`, so an info button speaks its full what/how explanation.

`/records` adds an explicit-confirmation upload flow for PDF, images, XML and JSON.
Original file bytes are stored in IndexedDB and remain separate from patient-authored
health facts; selecting a file only stages it. The page also presents an honest
HIE/FHIR connection flow: no organization is shown as connected until a real
provider/payer integration, identity flow and patient consent exist. The dark
palette uses near-black graphite/navy surfaces, crisp blue-gray borders, an
ice-blue primary accent, and amber only for genuine change warnings. Dark-only
card depth, button states, form fields, anatomy selection, and the 3D body material
were tuned together; the light palette is unchanged. The former Timeline and Health Changes routes still redirect into the
merged `/my-health` view. Typecheck, all five verification suites, production build,
diff whitespace checks, 1280px desktop/light/dark and 390px mobile navigation were
exercised. No file was uploaded during QA, and no Git commit or push was made.

Incremental accessibility/body-map follow-up: every desktop side-rail dimension
that affects legibility (column width, labels, helper text, icons, row heights and
spacing) now uses `rem`, so the Small/Normal/Large/Largest root setting scales the
rail as well as page content. At Large the rail is 357.5px with 16.25px primary
labels; at Largest it becomes 411.125px with 18.6875px labels. Body Picture now
distinguishes `Left pelvis`, `Right pelvis`, and center `Pelvis` from 3D surface
coordinates, in the split 2D SVG, the accessible region list, English/Spanish
labels, and the deterministic text parser. A selection creates an always-visible,
non-editable location sentence alongside the patient's optional description; that
sentence, precise `bodyLocation`, and location-specific pain label all appear in
review and are saved only after the existing final confirmation. Verification
covered both pelvis sides and center, typecheck, all suites, production build, and
live Right pelvis selection through review without saving.

The next precision pass replaces broad bilateral zones that were still ambiguous.
Front/back torso clicks now resolve to left/right/center chest, upper/lower abdomen,
pelvis, and upper/lower back. Limbs resolve to shoulder, upper arm, elbow, forearm,
hand, thigh, knee, lower leg, and foot, always patient-left/patient-right. The
outer-upper-torso boundary was tightened so a deltoid click is a shoulder rather
than chest; thigh and lower-leg clicks no longer collapse to a generic leg. The
3D hit mapper, marker anchors, split 2D SVG, accessible region list, English/Spanish
labels, deterministic text parser, review text, and stored `bodyLocation` share
these exact terms. Automated checks cover the reported shoulder/chest boundary,
right thigh versus right lower leg, back side, pelvis sides/center, and typed
English/Spanish phrases. Live QA selected and reviewed Right chest, Right thigh,
and Right lower leg without performing the final save.

The head/shoulder follow-up adds patient-relative left/right ears, left/right
and center face, plus left/right armpits to the 3D hit mapper, vector fallback,
accessible region list, English/Spanish labels, stored pain labels, and offline
text parser. Decorative 3D ear meshes are now selectable instead of falling
through to Head. Body Picture's optional description also has a microphone that
appends transcribed speech to any existing text while leaving the automatically
captured body location intact. Live QA selected Right armpit, Right ear, and
Right face in the vector map and confirmed the voice-description control without
saving an entry; typecheck, all verification suites, and production build pass.

Sidebar help dialogs are portaled to the viewport rather than rendered inside
the rail's scroll container. They stay anchored to the selected info button,
clamp to the screen edges, flip above lower controls when needed, and gain their
own vertical scroll only if the explanation is taller than the viewport. Live QA
covered My Health and Doctor visit help at the Largest text setting in a
1280×800 viewport; both dialogs remained fully visible and readable.

Content-only follow-up: onset summaries now use at most two short patient-voice
sentences. Exact agreement says when the symptom started; earlier related records
get a separate sentence without implying one continuous episode. Missing onset
uses the first recording date, approximate statements remain approximate, and
backfilled records are not described as entered on their occurrence date.
`summaryForDisplay` also recognizes the retired verbose onset template. It stays
read-only and preserves patient edits, approval state, and other sections. The
shared section feeds both screens and full/per-section speech. Regression cases
cover matching/conflicting/missing/approximate onset, multiple earlier records,
singular/plural wording, calendar boundaries, and serialized summaries. No UI or
My Health/Fitbit changes were made in this follow-up.
Verification: typecheck, all five `npm run verify` suites, production build, and
diff whitespace checks passed. Live `/explain` and `/clinician` both display the
requested two-sentence demo wording. Speech text and serialized-summary parity
are covered by assertions; actual audio and browser printing were not exercised.

The latest incremental pass preserves routes, records, schemas, and Fitbit code.
Preferred navigation labels now come from `nav` translations; Guided Check-In is
included in both navigation menus and its breadcrumb. Its page context suppresses
the dismiss control and uses Lucide category icons. Body Picture has one form-end
Add to Timeline action, followed by the existing review step; a radio-group view
selector replaces the old 2D toggle. Static loading silhouettes reserve the canvas
footprint; failed loads offer 2D/list selection plus a cache-clearing 3D retry.
Body materials are warm matte, and orbit damping respects OS reduced motion.

`lib/health/onset.ts` resolves relative statements against `recordedAt`, separates
stated onset from first recording/occurrence evidence, and does not infer continuous
symptoms. Both summary screens call `summaryForDisplay` for a read-only correction
of the exact old contradictory template; it never migrates saved records or changes
other patient-edited text. New summaries use the same deterministic onset logic,
and the optional LLM rewording cannot rewrite that section.

Health Changes replaces (unmounts) charts with five `CalmMeasurement` components
under low stimulation, using the same recent window as detection. Timeline removal
lives behind `EntryActions`, with a separate confirmation, cancellation/focus return,
pending guard and visible failure handling. No deletion or test save was performed.

Fiber 9.7.0 still constructs deprecated Three Clock instances. The narrowly scoped
webpack `scripts/fiber-timer-loader.cjs` replaces only that construction with the
tested `lib/body/TimerClock.ts` adapter using Three Timer. It fails loudly if upstream
code changes. No dependency version was changed; remove the compatibility loader
when stable Fiber migrates. Do not switch to Turbopack without porting this loader.

Checks: `git diff --check`, typecheck, all existing verify suites plus
`scripts/verify-ui-fixes.ts`, production build; all eight requested routes at desktop
and 390×844; live keyboard selection/review, static/chart switching, mobile More,
themes/high contrast/large text/Spanish UI, Timeline confirm/cancel, and deliberately
failed model fetch → usable fallback → successful retry retaining selection.
Fresh normal browser sessions had no warnings/errors. Injected failure logs were
expected. Real screen-reader/audio output and physical-device touch need manual QA;
final save/delete commits were deliberately not exercised on the user's record.

The user's new references supersede the earlier warm/teal visual direction.
Dark charcoal is the default, with a light/dark button in the desktop top bar,
mobile header, and clinician header. `Settings.theme` persists under the existing
settings key; the pre-paint script applies it without flashing. High contrast
continues to override palette tokens independently.

`components/body/BodyScene.tsx` is now the default dynamically loaded 3D view.
It uses the local 2.57 MB `public/models/carebridge-human.glb`, derived from CC0
MakeHuman graphical assets (source links and license are in `public/models/`).
`scripts/prepare-body-model.mjs` documents the reproducible mesh conversion.
Surface clicks map to canonical patient-relative regions and a shader draws the
pain hotspot. Front/back/left/right, orbit, zoom, reset, and expand are functional.
`AnatomyMap.tsx` remains the interactive 2D alternative and WebGL-failure fallback;
the accessible region list remains available. Legacy procedural `Body3D.tsx` is
unused. There are no remote runtime image/model dependencies.
The dedicated page has an always-visible detail
panel, nullable 0–10 intensity, description, onset, descriptors, and review before
saving. A save lock prevents duplicate submissions, and failures stay on the review.
The reference's sample symptoms are not prefilled as patient data. Sidebar names
and placement follow the reference; the top theme button remains available.

Verified: typecheck, domain verification suite, production build, desktop/light/dark
and 390px mobile UI, keyboard region selection, persisted theme after reload, and
synthetic Body Picture → review → save → timeline reload on isolated 127.0.0.1
browser storage. The localhost patient record was not used for test saves.

**Nothing is in progress**, except one external step only the human can do:

1. **Finish live Fitbit validation.** Google Cloud credentials are configured
   locally and Personal authorization/resting-HR import succeeded. Read-only
   checks of the corrected steps/sleep adapter also succeeded. Next: the user
   clicks Sync now, compares imported values with the wearable app, and tests
   disconnect/reconnect. Token refresh still needs live verification. Keep
   credentials private; never log tokens or include patient records in fixtures.
2. **English → patient-language summary.** Input translation works (Spanish in,
   English preserved alongside the original). The reverse — reading the finished
   summary back in Spanish — only works when an LLM key is present; there is no
   offline path. See "Known limits".
3. **Production deployment is deliberately out of scope.** The controlled
   profiles are local hackathon identities, not public authentication.

---

## Architecture map

```
app/
  layout.tsx              Settings + health-data providers, Chrome, next/font Inter,
                          no-flash script (sets data-textsize/contrast/motion/density
                          before first paint)
  globals.css             Design tokens (warm canvas, teal brand, sand accent) and the
                          data-* driven accessibility theming
  page.tsx                Home. Light entry points only (mood row, compact composer,
                          three links, a Today chronology) — the full experiences each
                          live on their own route below
  tell-carebridge/page.tsx  The full AssistantPanel experience
  body-picture/page.tsx     The flagship 3D body-region picker (see components/body/)
  guided-check-in/page.tsx  ManualEntry with forceWizard — one question at a time,
                          independent of the Low Stimulation setting
  my-health/page.tsx        Unified record: changes, cycle-aware patterns/charts,
                            event history, Fitbit, and future connections
  records/page.tsx          Explicit-confirmation local document upload plus an
                            honest consented HIE/FHIR connection explanation
  timeline/page.tsx         Compatibility redirect to /my-health#recent
  insights/page.tsx         Compatibility redirect to /my-health#patterns
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
    fitbit/               OAuth + sync against the Google Health API (see below)
components/
  Chrome.tsx              TopNav + SideNav outside /clinician; a minimal chrome-free
                          header on the clinician view
  TopNav.tsx              Grouped theme/settings/profile controls and compact menu
                          below the side-rail breakpoint
  SideNav.tsx             Sticky desktop navigation; related capture and visit tools
                          are nested so it reads as five primary choices
  BrandMark.tsx           Two overlapping circles. The entire logo, deliberately
  ui/                     Reusable primitives: PageHeader, SectionHeader,
                          SegmentedControl, HealthMetric (usual/recent/delta row),
                          TimelineEntry (dot+line+content), SourceBadge (Fitbit tag),
                          CollapsibleSection (summarized disclosure container)
  body/                   Body Picture. BodyScene.tsx (local human R3F/three.js scene,
                          lazy-loaded), BodyPicker.tsx (lazy-loads BodyScene behind an
                          error boundary, always pairs it with BodyRegionList),
                          BodyRegionList.tsx (the accessible fallback — same region
                          ids, plain buttons), BodyPickerErrorBoundary.tsx
  health/FitbitConnect.tsx  Setup required / Disconnected / Connected states, never faked
  health/HealthHistory.tsx  Shared day-grouped health-event chronology inside My Health
  records/                 RecordUploader (stage, confirm, IndexedDB save/open) and
                           RecordConnection (permission-first HIE/FHIR explanation)
  HelpTip.tsx             The circled i. Copy lives in lib/i18n/messages.ts now
  a11y/                   SettingsProvider (text size, contrast, motion, density,
                          language), AccessibilityControls (the actual toggles,
                          horizontal or vertical layout), AccessibilityPanel (the
                          sidebar-triggered popover — this is what's mounted now,
                          not the old full-width AccessibilityBar), useT()
                          (UI-chrome translation), ReadAloud (global click-to-speak)
  assistant/              AssistantPanel (the centrepiece, now page-level content on
                          /tell-carebridge, `h1` not `h2`) + ConfirmationCard. Renders
                          BodyPicker/SeverityScale inline under an "ask" turn when
                          missingFields[0] is bodyLocation/severity. Takes an optional
                          `initialMessage` prop for Home's handoff (see
                          lib/assistantHandoff.ts)
  manual/                 ManualEntry (one-question wizard under Low Stimulation OR
                          `forceWizard`, flat form otherwise — same save() path
                          either way; pain step uses BodyPicker now), BodyMap,
                          SeverityScale — BodyMap (the old 2D picker) is kept
                          on purpose only for QuickPhrases' quick in-appointment tap
  health/useHealthData.tsx  Profile-scoped read model over `/api/backend`; consumes server baseline/trends
  profile/
    ProfileProvider.tsx     Session/context boundary, switch aborts, stale-response rejection
    ProfileSwitcher.tsx     Controlled Personal ↔ Alex switch + demo indicator
    LegacyMigrationGate.tsx Explicit review/import of old browser records
    ProfileLanguageSync.tsx Per-profile language over device-level a11y settings
  insights/               ChangeBanner, WhyAmISeeingThis (now built on HealthMetric),
                          MetricChart
  explain/SummaryEditor   One flowing document (thin dividers, not stacked cards),
                          per-section edit and a quiet Eye/EyeOff visibility toggle
  clinician/              VoiceAdvocate, QuickPhrases, DoctorSpeaks
  voice/                  useVoiceInput (mic), useSpeaker (speech + on-screen transcript)
  onboarding/Tutorial     Three screens, then out of the way; doesn't auto-open under
                          Low Stimulation (checked via useSettings().ready to avoid a
                          flash before the persisted setting loads)
lib/
  schema.ts               The single internal language. Every type is a Zod schema
  dates.ts                Local-time day keys and relative phrasing
  utils.ts                cn()
  assistantHandoff.ts     sessionStorage handoff so Home can start a fresh
                          /tell-carebridge conversation (typed text, a mood prompt,
                          or "start recording") without duplicating chat state
  records/documentStore.ts  IndexedDB store for original uploaded files; documents
                            do not enter the event repository automatically
  body/regions.ts         BODY_REGIONS — the single list of selectable region ids,
                          shared by Body3D (visual placement) and BodyRegionList
                          (the accessible fallback), so the two pickers can't drift
  i18n/messages.ts        en/es UI-chrome dictionaries. Stored/matched values (event
                          labels, onset strings, BodyMap/Body3D region ids) are never
                          in here — only what the patient reads. See useT.tsx above.
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
    categories.ts         Patient-facing category names, emoji, severity words,
                          painLabelFor() (shared by ManualEntry and the Body Picture
                          page so both produce the same label from a location)
    createEvent.ts        The one place a draft becomes a HealthEvent
    sources.ts             HealthSource interface. Fitbit is real; Apple Health and
                            Health Connect are typed stubs, never shown as connected
    googleHealth.ts         OAuth+PKCE and dailyRollUp calls against the Google
                            Health API (the Fitbit Web API's successor)
    fitbitSync.ts           Client-side read-merge-write into DailyMetric by date;
                            runs in the browser because LocalRepository has to
  store/
    seed.ts               Alex's deterministic history
  backend/
    database.ts           Local SQLite, controlled sessions, profile revisions
    store.ts              Profile-bound SQL reads/writes; no unscoped health query
    health.ts             Scoped snapshot, baseline, trends, summary, AI contexts
    http.ts               `/api/backend/*` contract and request/context enforcement
    fitbit*.ts            Personal-only OAuth, token lifecycle, normalize/persist
    client.ts             Frontend contract types and context response policy
  migration/legacy.ts     Read-only legacy classification; no automatic ownership
scripts/
  verify-engine.ts        Seed, baselines, detection thresholds
  verify-fallback.ts      The deterministic parser, including the demo dialogue
  verify-guards.ts        No-diagnosis guard, both directions
  verify-advocate.ts      Grounded answers, refusals, citations, summary safety
  check-voice.ts          What is configured + ElevenLabs quota
  rehearse.ts             Walks the whole demo script against a running server
  verify-profile-*.ts     Persistence/API/frontend cross-profile contamination checks
  rehearse-profiles.ts    Destructive rehearsal for a disposable non-3000 database
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
- **Every health request is profile-scoped in the backend.** Frontend filtering
  is not a security or ownership boundary. Use `ProfileStore` and send the
  session's `X-CareBridge-Context`; never add an unscoped SQL health query.
- **Profile switches are destructive to transient UI state by design.** Abort
  old requests, reject late response contexts, unmount chat/summary/Q&A state,
  stop speech, and clear cached audio before rendering the new profile.
- **Do not restore the deleted local repository path.** localStorage is retained
  only for display accessibility preferences and one-time read-only migration.
- **`lib/i18n/messages.ts` translates display text only.** Anything stored
  (`HealthEvent.label`, `onset`) or matched against `lib/ai/fallback.ts`'s
  vocabulary (`BODY_PARTS`, `bodyLocation`) stays English at every layer —
  only the label a component renders goes through `useT()`.
- **`data-density="calm"` (Low Stimulation) is a separate concern from
  `data-motion="reduced"`.** Motion controls animation; density controls how
  much is on screen. Mark anything that should disappear under it with
  `data-density-hide` in CSS rather than branching on `settings` in the
  component — `ManualEntry`'s step wizard and `Tutorial`'s no-auto-open are
  the only deliberate JS-level exceptions, because a modal that opens then
  gets hidden still steals focus for a moment.
- **One ElevenLabs voice everywhere.** `Speaker` ("patient"/"clinical") is
  still threaded through `lib/voice/*` for shape-compatibility, but
  `voiceIdFor()` ignores it — do not reintroduce a second voice id without
  updating `app/clinician/page.tsx`'s single "Read this out loud" button and
  `scripts/check-voice.ts` together.
- **`missingFields` on an "ask" turn must come from `missingFieldsFor(draft)`,
  not trusted from the LLM.** `lib/ai/assistant.ts`'s `runAssistantTurn()`
  recomputes it whenever `action === "ask"` and a draft exists — the LLM
  reliably asks a sensible question but reliably leaves `missingFields: []`,
  and `AssistantPanel`'s inline `BodyPicker`/`SeverityScale` render off that
  field. Found by driving the app with a live LLM key during this task; don't
  revert to trusting the model's own `missingFields`.
- **Body region ids are the contract between three pickers and the text
  parser.** `lib/body/regions.ts`'s `BODY_REGIONS`, `Body3D`'s mesh
  placements, `BodyRegionList`, the old 2D `BodyMap`, and
  `lib/ai/fallback.ts`'s `BODY_PARTS` table all have to agree on the exact
  same English strings (`"Left shoulder"`, not `"left_shoulder"` or
  `"shoulder_left"`). Adding a region to one without the others breaks that
  path silently — the picker will let you select it, but free-text mentions
  of it won't resolve to the same value, or vice versa.
- **The 3D body (`components/body/BodyScene.tsx`) is lazy-loaded via
  `next/dynamic(..., { ssr: false })` and must stay that way.** Its runtime
  `three`/`@react-three/fiber`/`@react-three/drei` imports stay behind it;
  importing them anywhere that isn't behind that dynamic import will ship the
  3D bundle to every route. `npm run build`'s per-route size table is the
  check — `/body-picture` should stay near the other pages' First Load JS,
  not balloon.
- **`AccessibilityControls` (the actual toggles) is separate from
  `AccessibilityPanel` (the popover chrome) on purpose.** The controls
  component takes a `layout` prop and is reused nowhere else today, but if a
  future screen needs the toggles inline again, extend layout rather than
  copying the buttons.

## Environment variables

Everything is optional; see `.env.local.example`. What degrades without each:

| Variable | Missing means |
|---|---|
| `LLM_PROVIDER` + matching key | Assistant uses the rule-based parser; summaries use the deterministic builder; doctor Q&A uses the keyword matcher. Full demo still works. |
| `ELEVENLABS_API_KEY` | Speech falls back to browser `SpeechSynthesis`; voice input falls back to `SpeechRecognition` (Chrome only). |
| `ELEVENLABS_VOICE_ID` | A default voice is used. |
| `ELEVENLABS_CLINICAL_VOICE_ID` | Recognized but unused — HealthThread uses one voice (`ELEVENLABS_VOICE_ID`) everywhere. |
| `GOOGLE_HEALTH_CLIENT_ID` / `GOOGLE_HEALTH_CLIENT_SECRET` / `CAREBRIDGE_FITBIT_REDIRECT_URI` | Personal shows "Setup required." Alex remains synthetic-only. |

## Hosting

Local-only at the user's request (September 19, 2026). The current production
build runs from `/Users/madalaabhay/Documents/CAREBRIDGE` at
`http://localhost:3000`, bound to `127.0.0.1`; the home route returned HTTP 200.
Start it with `npm run start -- --hostname 127.0.0.1 --port 3000` after building.

The user explicitly requested removal of the outdated Vercel preview. Deployment
`dpl_AQwzm6orHH8o1VMHLz4EsM6JDo75`
(`carebridge-apl68brbp-madalaabhay1-2226s-projects.vercel.app`) was deleted;
Vercel confirmed one deployment removed. The Vercel project `carebridge` under
`madalaabhay1-2226s-projects` and its failed production-deployment history were
left intact. Local source, `.env.local`, and patient browser storage are untouched.
Do not redeploy without a new user request. `vercel.json` remains for historical
configuration; no secrets were uploaded by the earlier preview deployment.

## How to run

```bash
npm install
cp .env.local.example .env.local   # optional
npm run dev                        # http://localhost:3000
npm run verify && npm run typecheck && npm run build   # before committing
npm run rehearse     # walks the demo script against a running dev server
```

**Do not run `npm run build` while `npm run dev` is running.** They share
`.next/`, and the build replaces the dev server's chunks, leaving every page a
500 until dev is restarted. Stop dev first, or build in a separate checkout.

## Deliberate shortcuts — do not "fix" these

- **Local SQLite and controlled sessions, not production auth.** This is a
  two-profile hackathon boundary for one trusted local machine. Never expose it
  on a LAN or public deployment. Production needs real authentication,
  authorization and encrypted managed storage.
- **Exactly two profiles.** Personal and Alex are not a general multi-user,
  caregiver, family or dependent system.
- **The backend database is not encrypted at rest by this app.** It is
  gitignored under `.carebridge-data`, with restrictive file permissions.
- **Legacy health APIs return HTTP 410.** Do not reconnect screens to them;
  all owned health reads/writes use `/api/backend/*`.
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
- **The live LLM path sometimes writes `bodyLocation` outside `BodyMap`'s
  vocabulary** (e.g. "stomach" instead of the canonical "Lower abdomen") even
  though the deterministic fallback always uses the shared vocabulary —
  `npm run rehearse` with a real key can fail the "location survived the
  follow-up" check for this reason. This is a prompt-calibration gap in
  `lib/ai/prompts.ts`, not something this task's changes touch or fix; the
  fallback path (the one AGENTS.md treats as defensible) is unaffected —
  confirmed by rehearsing once with `.env.local` renamed, which passes clean.
- **Fitbit live QA is partial.** Personal OAuth and resting-HR import succeeded;
  corrected steps/sleep fetch and normalization passed read-only live checks.
  Physical device comparison, token refresh and disconnect/reconnect remain.
  Testing-mode OAuth tokens expire in 7 days, so "reauth required" is expected.
- **The realistic body is a communication aid, not a medical segmentation model.**
  Surface hit tests map to broad canonical regions using local coordinates and
  face direction. The region list is the precise keyboard/screen-reader path.
  Three.js materials read theme/high-contrast settings explicitly because they
  cannot inherit CSS colors; this is an intentional styling exception.

## Demo script

See `README.md`. It defines what must not regress.
