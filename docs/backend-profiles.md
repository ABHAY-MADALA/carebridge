# Profile backend: implementation plan and frontend contract

## Boundary

The backend-only phase was completed first on September 19, 2026. The frontend
cutover is now also complete: screens use `/api/backend/*`, the old browser
repository/client Fitbit merge modules are removed, and legacy unscoped health
routes return HTTP 410. This remains a local two-profile hackathon system, not
production authentication.

## Inspection and plan

- `lib/store/localRepository.ts` uses global localStorage keys for events,
  daily metrics and summaries. No existing backend health database exists.
- `components/health/useHealthData.tsx` reads/writes that repository, computes
  baselines/trends, and resets/seeds Alex. Manual and body-picture forms write
  through the same repository. These frontend files are out of scope here.
- `lib/health/baseline.ts` and `trends.ts` are deterministic engines to reuse.
- `app/explain/page.tsx` builds a summary from provider state; the existing
  `/api/summary` polishes a client-supplied summary. `/api/ask` trusts client
  context. New endpoints must build these contexts from server queries instead.
- Existing Fitbit OAuth uses global token cookies; sync returns rows for a
  browser-side merge. New OAuth credentials and sync must be Personal-owned.
- Preserve the existing **84-day**, three-cycle Alex seed (not shorten to 30).

Implementation sequence:

1. Add owned server schemas and SQLite persistence; every health query is bound
   to one validated profile, with ownership checks and composite primary keys.
2. Add controlled local sessions, profile switching, context-revision guards,
   and scoped event/metric/timeline/summary/settings/AI APIs.
3. Add Personal-only OAuth and backend Fitbit persistence, retaining the current
   provider adapter without pretending its live integration is verified.
4. Add explicit legacy import: confirmed synthetic snapshots go to Alex only;
   ambiguous old records are never assigned automatically. Never delete browser
   data or initialize Personal from Alex.
5. Test all twelve contamination scenarios, request boundaries, persistence,
   migration and race cases. Run existing checks in an isolated build copy so
   `.next` and port 3000 used by the frontend agent remain untouched.

## Implemented backend

`lib/backend/` and `app/api/backend/[...path]/route.ts` implement the new path.
SQLite (`node:sqlite`, verified on Node 22.18.0) stores both identities in
`.carebridge-data/carebridge.sqlite`, or the absolute path configured by
`CAREBRIDGE_DATABASE_PATH`. The directory is gitignored and mode 0700 when
created; the database is mode 0600. Back up the database with SQLite-aware tools
(including its WAL when appropriate). It contains sensitive health data and
Personal OAuth credentials. It is **not encrypted at rest** by this application.

`records` has composite primary key `(user_id, kind, id)`. `ProfileStore` binds a
validated identity once and includes it in every health SQL read/update/delete.
Stored events, device metrics, daily aggregates, summaries, conversations and
settings carry `userId`. Demo records additionally carry `synthetic: true`.
Connection storage has a database CHECK restricting ownership to `personal`.
There is no request-body user ID that grants access to an arbitrary profile.
Same record IDs across profiles cannot overwrite or delete one another.

Personal starts empty. The first Alex health read initializes the existing
84-day deterministic seed locally, with no network. Reset reinitializes Alex
only. It does not clear Personal events, measurements, settings or credentials.
Reads do not silently reseed yesterday's demo; an explicit confirmed reset
refreshes the scenario relative to today's date.

HealthEvents remain patient reports. Fitbit imports create separate HealthMetric
records and wearable daily aggregates. Personal daily pain/fatigue are derived
from that profile's confirmed events (maximum recorded severity per local day).
The existing deterministic math engines run on these scoped rows. Per-metric
missing baselines stay null and the response includes `Building your baseline`;
neither population values nor Alex fill missing Personal data. Fitbit null or
unavailable values never replace historical values with fabricated numbers.

### Local controlled sessions, not production authentication

These two identities are explicitly for one trusted person using a local
hackathon machine. An opaque random HttpOnly, SameSite=Lax cookie identifies a
server-stored 12-hour session, defaulting to Personal. Only hashed session tokens
are persisted. Switching changes that session's active profile and increments a
revision. It does not change a global user. No new accounts or dependents exist.

The API rejects non-loopback hostnames, cross-origin requests, and mutations
without its custom request header. **Keep Next bound to 127.0.0.1.** Hostname
checks are not a substitute for network binding or authentication. Do not expose
this app on LAN/public hosting; anyone who can access the local API can choose
either seeded identity. Production deployment needs real authentication,
authorization, session lifecycle/rate limiting, encrypted secret storage, and a
durable managed database. Node currently reports SQLite's experimental warning;
do not run this backend in Edge/serverless ephemeral storage.

## Frontend integration contract (for the other agent)

Merged UI addition: `GET /documents` lists only current-profile metadata;
`GET /documents/file?id=<UUID>` returns owned original bytes as base64;
`POST /documents` accepts `{confirmed:true,files:[{id,name,data}]}` with base64
bytes. Uploads are Personal-only, transactionally saved and idempotent by ID and
content. Limits are 15 MB/file, 30 MB/batch, and 20 files/batch. Documents do not
enter AI context, summaries or health events. Historical unowned IndexedDB files
are preserved but not automatically imported. The frontend sends expectedContext
after reading files so a profile switch cannot redirect an upload to a new owner.

All paths below are prefixed `/api/backend` and return `Cache-Control: no-store`.
No CORS access is enabled. Use same-origin requests with cookies.

1. `POST /session` with `X-CareBridge-Request: 1` establishes/reuses the session.
   Response: `{profile, profiles, context}`. `GET /session` recovers the active
   context after reload (401 means bootstrap again).
2. Send `X-CareBridge-Context: <context>` on **every** health request. Also send
   `X-CareBridge-Request: 1` and JSON Content-Type for every POST.
3. `POST /profile` with `{userId: "personal" | "alex-demo"}` and the *old*
   context returns the new profile/context. Stop audio, cancel pending requests,
   clear drafts/chat/summaries/provider caches, and remount the health provider
   before rendering the new profile. Do not display old data during loading.
4. Responses include `X-CareBridge-Context`; ignore late responses not matching
   the current context. A 409 stale-context response requires recovering the
   session, clearing old state and retrying only intentional reads. Do not
   automatically replay a write under the new profile.

| Method/path | Request | Response/use |
|---|---|---|
| GET `/health` | — | Owned events, device metrics, daily aggregates, baseline readiness and trend evidence |
| GET `/events` | — | Current profile's events |
| POST `/events` | `{confirmed:true, events:[HealthEvent,...]}` | Owner-stamped confirmed records; IDs must be unique within a profile; retries with identical contents are safe |
| POST `/events/delete` | `{confirmed:true,id}` | Deletes only that profile's event; not-found across profiles |
| GET `/metrics` | — | Device metrics and daily aggregates; no client-side Fitbit merge |
| GET `/timeline` | — | Patient events and daily wearable entries with explicit source labels |
| POST `/summary/generate` | `{}` | Server-built, unapproved owned summary; generation does not save |
| POST `/summary/save` | `{confirmed:true,approve:boolean,summary:OwnedSummary}` | Validates owner and persists edits/approval; server sets approval timestamp |
| GET `/summary` | — | Persisted summary for this profile |
| GET `/speech` | Optional `?section=<id>` | Approved full/per-section summary text; excluded sections cannot be spoken |
| POST `/ask` | `{question}` | Answer using server-built current-user context only; client arrays/detections are rejected |
| POST `/assistant` | `{text,conversationId?:UUID}` | Existing safe ask/propose shape plus `userId,conversationId`; server-owned history, no event save |
| GET `/settings` | — | Per-profile language and external-AI preference |
| POST `/settings` | `{language:"en"|"es",allowExternalAI?:boolean}` | Profile preference update; optional fields default to English/false |
| POST `/demo/reset` | `{confirmed:true}` | Alex-only reset/reseed; Personal gets 403 |
| POST `/demo/import` | See migration below | Explicit synthetic import only |
| GET `/fitbit/status` | — | Actual connection status, configured/allowed flags, real lastSyncAt; never tokens |
| POST `/fitbit/start` | `{}` | Personal-only authorizationUrl; navigate after explicit user action |
| GET `/fitbit/callback` | OAuth code/state | Consumes session-bound pending authorization and saves Personal credentials |
| POST `/fitbit/sync` | `{}` | Server fetch/normalize/persist; returns count, unavailable fields and actual lastSyncAt |
| POST `/fitbit/disconnect` | `{confirmed:true}` | Removes only Personal credentials/pending OAuth; preserves imported history |

Event bodies may omit userId/synthetic because the server stamps them. If present,
they must match the active context. Events preserve originalInput, original
language and additive translation. Proposed assistant drafts still need the
existing confirmation UI before POSTing events. A summary save must retain its
server-generated userId/synthetic fields. Event mutations and successful Fitbit
imports invalidate a saved summary so it must be regenerated/reapproved.

The new backend does not accept client-supplied health context in AI requests.
Doctor Q&A loads profile-owned events/metrics and computes scoped trends. The
intake assistant uses only that profile's server-stored conversation; it does not
mix client chat histories. Personal external AI is opt-in and defaults off.
Alex always uses deterministic fallback, regardless of keys or preferences.
No summary or health event is saved by the assistant itself.

### Frontend cutover (completed)

- `ProfileProvider` bootstraps the HttpOnly session, sends context headers,
  aborts switches, and rejects late responses from the old context.
- `HealthDataProvider` consumes server-owned events/daily metrics, baseline,
  trends, timeline and summaries; it no longer computes ownership client-side.
- Controlled Personal/Alex switching, profile-driven identity and the persistent
  `Demo · Synthetic data` indicator are present across normal and clinician UI.
- Text/voice assistant, manual check-in, Body Picture, delete, summaries,
  grounded doctor Q&A, demo reset and Fitbit all use scoped backend endpoints.
- Old browser data is blocked behind an explicit review gate. Seeded records
  can go only to Alex; ambiguous events require row-by-row Personal selection;
  old Fitbit rows and summaries are never imported automatically.
- Speech blobs, assistant handoff state and mounted profile UI state are cleared
  on switch. The old unscoped health routes return HTTP 410.

## Fitbit setup and normalization

Set server-only `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET` and
`CAREBRIDGE_FITBIT_REDIRECT_URI=http://localhost:3000/api/backend/fitbit/callback`.
Register that exact callback in Google's console. The new callback is deliberately
different from the legacy one, and old token cookies are never imported.
Authorization requests include activity, sleep and health-metrics read scopes.

OAuth state, PKCE verifier, session identity and profile revision live server-side.
Switching invalidates pending authorization. Callback replay, expiry, cancellation,
and switching during token exchange cannot save a connection. Tokens are never
returned to frontend code. Sync commits recheck both the profile revision and
connection generation, preventing a late sync from undoing disconnect/reconnect.
Disconnect removes local credentials; it does not revoke Google's account-level
grant. The user can revoke that separately in Google account permissions.

The new provider parser uses documented fields rather than the old generic
`Object.values(value)[0]` assumption:

- Steps: daily rollup `steps.countSum`, including a genuine zero.
- Sleep: reconciled sleep-session `summary.minutesAsleep`, aggregated by the
  session's civil end date; original interval timestamps and provider IDs retained.
- Resting HR: reconciled `dailyRestingHeartRate.beatsPerMinute`, not the rollup's
  personal min/max range.

Date-only observations remain date-only; no measurement timestamp is invented.
Requests select the Google wearable source family, follow pagination, cap requests,
and omit unsupported fields. Source `fitbit` denotes this Fitbit/Google Health
wearable integration, not proof of a particular device model. No mock connector
exists in production. Live authorization/sync with the user's device is **not
verified**; tests inject explicitly isolated fixtures, never fake a real connection.

Reference checked during implementation:
[dailyRollUp](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/dailyRollUp),
[StepsRollupValue](https://developers.google.com/health/reference/rest/v4/StepsRollupValue),
[reconcile](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/reconcile),
[data types](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints),
[filter syntax](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/list).

## Non-destructive migration

No browser data was read, uploaded, reassigned or deleted by this implementation.
Fresh Alex uses the existing known-synthetic seed. Personal remains empty.
For a reviewed legacy **synthetic-only** snapshot, switch to Alex and POST:

```json
{"confirmedSynthetic":true,"events":[],"metrics":[]}
```

Send the actual reviewed arrays; metrics must explicitly say `source:"demo"`.
Prefer importing before the first Alex health read so its historical seed dates
can be preserved exactly. Import preserves event original words and cycle fields,
is transactional and content-hash idempotent, and rejects conflicting existing
record IDs/dates instead of overwriting them. It rejects Fitbit rows and mismatched
owners. It cannot prove an unowned entry is synthetic from a prefix: the importing
human must review it. Do not include genuinely personal or ambiguous old entries.
Keep those in the original storage pending explicit ownership confirmation.
Derived trends and summaries are regenerated from scoped records, not imported
with potentially mixed provenance or silently marked approved.

## Verification

Commands (no new package dependencies or frontend files changed):

```sh
npm run typecheck
npm run verify
./node_modules/.bin/tsx scripts/verify-profile-backend.ts
./node_modules/.bin/tsx scripts/verify-profile-api.ts
npm run build
BASE_URL=http://127.0.0.1:3101 npm run rehearse
PROFILE_TEST_BASE_URL=http://127.0.0.1:3101 ./node_modules/.bin/tsx scripts/rehearse-profiles.ts
```

All passed. The 20 persistence/isolation groups cover all twelve requested
contamination scenarios, ownership spoofing, confirmation, migration,
settings/conversations, stale session writes, and reopening SQLite. The 14 API/
OAuth groups cover CSRF/context requirements, client-context rejection, approval
and speech, replay/failed authorization, stale sync, disconnected sessions,
normalization/pagination, and Alex with network disabled. Production HTTP rehearsal
checks both contexts, summary/speech, reset and switch-back preservation.

Full build/rehearsals ran in a temporary copy with no `.env.local`, on port 3101
and a disposable database. Port 3000, its `.next`, the frontend agent's files, and
the user's real records were not changed. Existing rehearsal passed keyless; live
LLM/voice/Fitbit calls and the future profile UI still require integration QA.
