import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { productionSecret, securityMode } from "./config";

const usedNonces = new Map<string, number>();
const MAX_SKEW_MS = 5 * 60_000;

export type VerifiedIdentity = { subject: string; authenticated: boolean };

function signatureFor(
  secret: string,
  req: Request,
  subject: string,
  timestamp: string,
  nonce: string,
) {
  const url = new URL(req.url);
  return createHmac("sha256", secret)
    .update(`${req.method}\n${url.pathname}\n${subject}\n${timestamp}\n${nonce}`)
    .digest("base64url");
}

/**
 * Production Personal mode is designed to sit behind an identity-aware proxy.
 * The proxy authenticates the human and injects a short-lived signed assertion;
 * the application verifies that assertion and rejects direct requests.
 */
export function verifyProductionIdentity(
  req: Request,
  now = Date.now(),
): VerifiedIdentity {
  if (securityMode() !== "production") {
    return { subject: "local-owner", authenticated: false };
  }

  const secret = productionSecret("HEALTHTHREAD_AUTH_PROXY_SECRET")!;
  const subject = req.headers.get("x-healththread-user")?.trim() ?? "";
  const timestamp = req.headers.get("x-healththread-auth-time")?.trim() ?? "";
  const nonce = req.headers.get("x-healththread-auth-nonce")?.trim() ?? "";
  const supplied = req.headers.get("x-healththread-auth-signature")?.trim() ?? "";
  const time = Number(timestamp);

  for (const [value, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(value);
  }

  if (
    !subject ||
    subject.length > 200 ||
    !/^[A-Za-z0-9._@:+-]+$/.test(subject) ||
    !nonce ||
    nonce.length > 200 ||
    !Number.isFinite(time) ||
    Math.abs(now - time) > MAX_SKEW_MS ||
    usedNonces.has(nonce)
  ) {
    throw new Error("production-identity-required");
  }

  const expected = Buffer.from(signatureFor(secret, req, subject, timestamp, nonce));
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("production-identity-invalid");
  }

  usedNonces.set(nonce, now + MAX_SKEW_MS);
  return { subject, authenticated: true };
}

export function resetIdentityNoncesForTests() {
  usedNonces.clear();
}
