import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { BackendDatabase } from "../lib/backend/database";
import { appendSecurityAudit, verifySecurityAudit } from "../lib/security/audit";
import { openBytes, openText, sealBytes, sealText } from "../lib/security/crypto";
import { resetIdentityNoncesForTests, verifyProductionIdentity } from "../lib/security/identity";
import { consumeRateLimit, resetRateLimitsForTests } from "../lib/security/rateLimit";
import { inspectDocument } from "../lib/security/upload";

let checks = 0;
function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

const previous = {
  mode: process.env.HEALTHTHREAD_SECURITY_MODE,
  encryption: process.env.HEALTHTHREAD_DATA_ENCRYPTION_KEY,
  auth: process.env.HEALTHTHREAD_AUTH_PROXY_SECRET,
  origin: process.env.HEALTHTHREAD_APP_ORIGIN,
  audit: process.env.HEALTHTHREAD_AUDIT_HMAC_KEY,
};

try {
  process.env.HEALTHTHREAD_SECURITY_MODE = "local";
  process.env.HEALTHTHREAD_DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  process.env.HEALTHTHREAD_AUDIT_HMAC_KEY = randomBytes(32).toString("base64url");

  check("AES-GCM protects text and document bytes and detects tampering", () => {
    const sealed = sealText('{"patient":"private"}', "record:personal:event:1");
    assert.notEqual(sealed, '{"patient":"private"}');
    assert.equal(openText(sealed, "record:personal:event:1"), '{"patient":"private"}');
    const prefix = "htenc:v1:";
    const tampered = Buffer.from(sealed.slice(prefix.length), "base64url");
    tampered[tampered.length - 1] ^= 1;
    assert.throws(() => openText(`${prefix}${tampered.toString("base64url")}`, "record:personal:event:1"));

    const bytes = Buffer.from("private document");
    const encrypted = sealBytes(bytes, "document:personal:1");
    assert.ok(!encrypted.equals(bytes));
    assert.ok(openBytes(encrypted, "document:personal:1").equals(bytes));
  });

  check("identity-aware proxy assertions reject replay", () => {
    process.env.HEALTHTHREAD_SECURITY_MODE = "production";
    process.env.HEALTHTHREAD_AUTH_PROXY_SECRET = "a".repeat(48);
    process.env.HEALTHTHREAD_APP_ORIGIN = "https://healththread.example";
    resetIdentityNoncesForTests();
    const subject = "rufaida@example.com";
    const timestamp = String(Date.now());
    const nonce = randomBytes(16).toString("hex");
    const path = "/api/backend/session";
    const signature = createHmac("sha256", process.env.HEALTHTHREAD_AUTH_PROXY_SECRET)
      .update(`POST\n${path}\n${subject}\n${timestamp}\n${nonce}`)
      .digest("base64url");
    const request = new Request(`https://healththread.example${path}`, {
      method: "POST",
      headers: {
        "x-healththread-user": subject,
        "x-healththread-auth-time": timestamp,
        "x-healththread-auth-nonce": nonce,
        "x-healththread-auth-signature": signature,
      },
    });
    assert.equal(verifyProductionIdentity(request).subject, subject);
    assert.throws(() => verifyProductionIdentity(request), /production-identity-required/);
    process.env.HEALTHTHREAD_SECURITY_MODE = "local";
  });

  check("fixed-window abuse control blocks requests over the limit", () => {
    resetRateLimitsForTests();
    const rule = { limit: 2, windowMs: 60_000 };
    assert.equal(consumeRateLimit("security-test", rule, 1).allowed, true);
    assert.equal(consumeRateLimit("security-test", rule, 2).allowed, true);
    assert.equal(consumeRateLimit("security-test", rule, 3).allowed, false);
    assert.equal(consumeRateLimit("security-test", rule, 60_002).allowed, true);
  });

  check("upload quarantine rejects spoofing, active content and malware fixtures", () => {
    assert.equal(
      inspectDocument("pdf", Buffer.from("%PDF-1.7\nHealth record\n%%EOF"), "application/pdf").mimeType,
      "application/pdf",
    );
    assert.throws(() => inspectDocument("pdf", Buffer.from("not a pdf"), "application/pdf"));
    assert.throws(() => inspectDocument("pdf", Buffer.from("%PDF-1.7\n/JavaScript\n%%EOF"), "application/pdf"));
    assert.throws(() => inspectDocument("txt", Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"), "text/plain"));
    assert.throws(() => inspectDocument("xml", Buffer.from("<!DOCTYPE x [<!ENTITY y SYSTEM 'file:///etc/passwd'>]><x/>"), "application/xml"));
  });

  check("audit chain reveals post-write tampering without storing PHI", () => {
    const db = new BackendDatabase(":memory:");
    const { session } = db.createSession();
    appendSecurityAudit(db, session, "event.create", "success", "event-id");
    appendSecurityAudit(db, session, "summary.approve", "success", "summary-id");
    assert.deepEqual(verifySecurityAudit(db), { valid: true, entries: 2, brokenAt: null });
    const text = JSON.stringify(db.sql.prepare("SELECT * FROM audit_log").all());
    assert.ok(!text.includes("event-id") && !text.includes("summary-id"));
    db.sql.prepare("UPDATE audit_log SET action=? WHERE id=?").run("tampered", 1);
    assert.equal(verifySecurityAudit(db).valid, false);
    db.close();
  });

  check("browser security policy blocks framing and limits powerful features", () => {
    const source = readFileSync("next.config.mjs", "utf8");
    for (const required of [
      "Content-Security-Policy",
      "frame-ancestors 'none'",
      "X-Frame-Options",
      "Strict-Transport-Security",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
    ]) {
      assert.ok(source.includes(required), `missing ${required}`);
    }
  });

  console.log(`${checks} focused security checks passed.`);
} finally {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  restore("HEALTHTHREAD_SECURITY_MODE", previous.mode);
  restore("HEALTHTHREAD_DATA_ENCRYPTION_KEY", previous.encryption);
  restore("HEALTHTHREAD_AUTH_PROXY_SECRET", previous.auth);
  restore("HEALTHTHREAD_APP_ORIGIN", previous.origin);
  restore("HEALTHTHREAD_AUDIT_HMAC_KEY", previous.audit);
}
