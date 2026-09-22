import { NextResponse } from "next/server";
import { publicDemoEnabled, publicDemoOrigin } from "@/lib/backend/runtime";
import { productionOrigin, securityMode } from "./config";
import { verifyProductionIdentity } from "./identity";
import {
  consumeRateLimit,
  requestFingerprint,
  type RateLimitRule,
} from "./rateLimit";

export type ApiSecurityResult =
  | { ok: true; identity: string; rateHeaders: Record<string, string> }
  | { ok: false; response: NextResponse };

function expectedOrigin(req: Request) {
  if (publicDemoEnabled()) return publicDemoOrigin().origin;
  const url = new URL(req.url);
  const host = req.headers.get("host") ?? url.host;
  if (securityMode() === "production") {
    const configured = productionOrigin()!;
    if (host !== configured.host) throw new Error("invalid-production-host");
    return configured.origin;
  }
  return `${url.protocol}//${host}`;
}

export function secureApiRequest(
  req: Request,
  scope: string,
  rule: RateLimitRule,
  options: { mutation?: boolean } = {},
): ApiSecurityResult {
  try {
    const identity = verifyProductionIdentity(req);
    const origin = req.headers.get("origin");
    if (
      (origin && origin !== expectedOrigin(req)) ||
      req.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return {
        ok: false,
        response: NextResponse.json({ error: "cross-origin-request" }, { status: 403 }),
      };
    }
    if (options.mutation && req.headers.get("x-carebridge-request") !== "1") {
      return {
        ok: false,
        response: NextResponse.json({ error: "request-header-required" }, { status: 403 }),
      };
    }

    const fingerprint = identity.authenticated
      ? `identity:${identity.subject}`
      : `network:${requestFingerprint(req)}`;
    const rate = consumeRateLimit(`${scope}:${fingerprint}`, rule);
    const rateHeaders = {
      "RateLimit-Limit": String(rate.limit),
      "RateLimit-Remaining": String(rate.remaining),
      "RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
    };
    if (!rate.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "rate-limit-exceeded" },
          {
            status: 429,
            headers: {
              ...rateHeaders,
              "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
            },
          },
        ),
      };
    }
    return { ok: true, identity: identity.subject, rateHeaders };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "production-identity-required" }, { status: 401 }),
    };
  }
}

export async function limitedJson(
  req: Request,
  maximumBytes: number,
): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new Error("body-too-large");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new Error("body-required");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maximumBytes) {
      await reader.cancel();
      throw new Error("body-too-large");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return JSON.parse(bytes.toString("utf8"));
}
