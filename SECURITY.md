# Security policy

HealthThread is a healthcare communication prototype with a deliberately
isolated public synthetic demo. It is not a HIPAA-compliant clinical system and
must not be used to provide emergency care, diagnose a condition, or store real
patient data on the public Render deployment.

## Supported security scope

Security fixes are made on the default branch. The public demo contains only
fictional Alex data. Local Personal mode is intended for one trusted developer
machine unless production mode is placed behind the documented identity-aware
proxy and configured with encryption and audit keys.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** private security-advisory flow for this
repository. Include the affected route, reproduction steps, impact, and whether
synthetic or real information was involved. Do not open a public issue containing
credentials, OAuth tokens, health information, or a working exploit.

## Security properties

- Every health query and mutation is bound to a validated profile and context
  revision; request bodies cannot select an arbitrary owner.
- State-changing requests require same-origin context and a custom CSRF marker.
- Sessions use random tokens, hashed server-side state, and HttpOnly/SameSite
  cookies. HTTPS deployments also use Secure cookies.
- Public demo sessions receive isolated, in-memory synthetic data and cannot
  access Personal, document uploads, or real OAuth.
- OAuth uses PKCE, expiring state, one-time consumption, profile binding, and
  post-provider race checks.
- Optional AES-256-GCM envelope encryption protects records, documents, and
  provider tokens at rest. Production mode requires a 32-byte encryption key.
- Sensitive changes create PHI-free HMAC hash-chained audit records.
- Uploads are quarantined in memory until extension, magic-byte, active-content,
  XML-entity, and known-malware-fixture checks pass.
- AI output is schema validated, grounded, citation constrained, and rejected
  when it uses diagnostic language. Nothing becomes a health event without
  explicit confirmation.

## Known limitations

- The built-in rate limiter is per Node process. Multi-instance production
  deployments require a shared store such as Redis.
- Built-in file inspection is defense in depth, not a replacement for a managed
  malware-scanning service.
- The CSP currently permits inline scripts/styles required by this Next.js
  build. A nonce-based policy is the planned production tightening.
- Production authentication expects signed assertions from an identity-aware
  proxy; HealthThread does not implement password storage.
- Application-layer encryption does not protect data already visible to a
  compromised running process.
- No compliance certification, BAA, clinical validation, disaster recovery, or
  formal penetration test has been completed.

See [the threat model](docs/security-threat-model.md) and
[the attack demonstration](docs/security-demo.md) for details.
