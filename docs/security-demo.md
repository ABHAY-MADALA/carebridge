# Security demonstration

Run the focused suite:

```sh
npm run verify:security
```

It demonstrates six controls without using real health information:

1. AES-256-GCM record/document encryption and tamper detection.
2. Signed production identity assertions and replay rejection.
3. Rate-limit enforcement.
4. File-signature, active-PDF, XML-entity and EICAR-fixture rejection.
5. Tamper-evident, PHI-free audit chaining.
6. Browser security-header coverage.

The broader suite adds profile and AI attacks:

```sh
npm run verify
npm audit --omit=dev --audit-level=high
```

Covered cases include cross-origin writes, owner spoofing, stale-profile writes,
OAuth replay and profile-switch races, forged AI citations, diagnostic model
output, assistant-message imports, and attempts to expose Personal data from the
public demo.

## Live demo narration

1. Open the public deployment and point out **Demo · Synthetic data**.
2. Explain that the deployed build has no Personal profile, real OAuth, or
   medical-record upload capability.
3. Show a proposed health entry and the explicit confirmation step.
4. Run `npm run verify:security` and briefly explain one rejected attack per
   trust boundary.
5. Open `docs/security-threat-model.md` to distinguish implemented controls from
   production responsibilities.

Never demonstrate with copied patient data, OAuth tokens, API keys, or a real
conversation archive.
