# HealthThread security threat model

## Objective and scope

This model covers the Next.js application, profile-scoped API, SQLite storage,
AI/voice providers, record uploads, and Fitbit/Google Health OAuth. The Render
judge deployment is a separate synthetic-only mode. It intentionally cannot
become a real patient account.

## Protected assets

1. Patient-authored symptoms and original wording.
2. Uploaded medical documents.
3. Fitbit/Google OAuth access and refresh tokens.
4. Approved doctor summaries and clinician Q&A context.
5. AI conversation imports and their provenance.
6. Session identifiers, encryption keys, audit keys, and provider API keys.

## Trust boundaries

```text
Browser
  | same-origin cookie + context revision + CSRF marker
  v
Next.js request boundary
  | validated profile-scoped operations
  v
Encrypted SQLite / temporary synthetic in-memory database

Next.js -- server-only secrets --> AI, ElevenLabs, Google Health
Identity-aware proxy -- signed assertion --> production Personal mode
```

The browser is not trusted to choose an owner, provide AI context, or prove that
a record is synthetic. External provider responses are untrusted and validated
before they affect storage.

## STRIDE analysis

| Threat | Example | Current mitigation | Residual risk |
|---|---|---|---|
| Spoofing | Forged Personal request | Production identity-proxy HMAC assertion, random server session, Secure/HttpOnly cookie | Identity proxy must be correctly configured |
| Tampering | Change a stored health row or audit entry | AES-GCM authenticated encryption; ownership checks; HMAC hash-chained audit log | Running-process compromise can still alter data before logging |
| Repudiation | Deny deleting or approving information | PHI-free append-only audit entries for mutations | Local developer can replace the whole database |
| Information disclosure | Alex reads Personal, token returned to browser, document ID guessing | Profile-bound SQL, context revision, OAuth tokens server-only, document ownership check, generic errors | Local storage is plaintext unless an encryption key is configured |
| Denial of service | Repeated LLM, voice, upload or OAuth requests | Endpoint-specific body limits and per-process rate limits | Multi-instance deployments need a shared limiter and upstream WAF |
| Elevation of privilege | Body supplies another `userId`; OAuth completes after profile switch | Server-stamped ownership, strict schemas, session revision, PKCE/state binding and race recheck | Current model has one Personal owner, not multi-tenant RBAC |

## AI-specific threats

- **Prompt injection from imported conversations:** provider replies are excluded;
  only user-authored messages become proposals, and proposals require review.
- **Model invents facts:** schema validation, missing-field checks, grounded
  server-owned context, known citation IDs, and deterministic fallback.
- **Unsafe medical claims:** output guard rejects diagnostic/advice language.
- **Data exfiltration to a model:** Personal model use defaults off; synthetic
  Alex never makes network calls. Production use requires explicit consent and
  an approved provider/data-processing agreement.

## Secure deployment profiles

### Public demo

- `HEALTHTHREAD_PUBLIC_DEMO=1`
- Alex only, synthetic data only, isolated per-session in-memory storage.
- No real Fitbit, Personal profile, record upload, or durable patient data.

### Local Personal

- Bound to loopback.
- One trusted developer on one computer.
- Optional encryption key; not remote authentication.

### Production Personal architecture

- `HEALTHTHREAD_SECURITY_MODE=production`
- HTTPS `HEALTHTHREAD_APP_ORIGIN`.
- Identity-aware proxy signs a fresh subject, timestamp, and nonce for every
  request using `HEALTHTHREAD_AUTH_PROXY_SECRET`.
- `HEALTHTHREAD_DATA_ENCRYPTION_KEY` is 32 random bytes encoded as base64.
- `HEALTHTHREAD_AUDIT_HMAC_KEY` is a separate random secret.
- Managed database/object storage, secret manager, shared rate limiter, WAF,
  malware scanner, backups, monitoring, key rotation and tested recovery remain
  deployment responsibilities.

This architecture is a security foundation, not a compliance certification.
