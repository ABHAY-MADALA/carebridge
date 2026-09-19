import { NextResponse } from "next/server";
import { z } from "zod";
import { HealthEvent, DailyMetric } from "@/lib/schema";
import { BackendDatabase, getDatabase, type Session } from "./database";
import { ProfileId, PROFILES, OwnedSummary, AIImportCandidateInput, BackendError } from "./schema";
import { ProfileStore, newRecordId } from "./store";
import { healthSnapshot, timeline, generateSummaryForProfile, ask, assistant, approvedSpeech } from "./health";
import { FitbitService } from "./fitbit";
import { DocumentStore } from "./documents";

const cookieName = "carebridge_backend_session";
export const contextKey = (s: Session) => `${s.userId}:${s.revision}`;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200, session?: Session) => NextResponse.json(data, { status, headers: { ...headers, ...(session ? { "X-CareBridge-Context": contextKey(session) } : {}) } });
const profileInfo = (s: Session) => ({ profile: PROFILES.find(p => p.id === s.userId), profiles: PROFILES, context: contextKey(s) });
const Confirm = z.object({ confirmed: z.literal(true) }).strict();

function requestBoundary(req: Request, callback: boolean) {
  const url = new URL(req.url);
  // Next may normalize req.url to localhost even for a 127.0.0.1 browser.
  // Validate the actual Host before comparing Origin; never trust forwarded hosts.
  const host = req.headers.get("host") ?? url.host;
  let requestOrigin: URL;
  try { requestOrigin = new URL(`${url.protocol}//${host}`); }
  catch { throw new BackendError(403, "invalid-host"); }
  // Controlled identities are for a single-user LOCAL hackathon host, not auth
  // for a publicly deployed medical service. Fail closed off loopback.
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new BackendError(403, "local-profile-backend-only");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(requestOrigin.hostname) || requestOrigin.host !== host || requestOrigin.port !== url.port) throw new BackendError(403, "local-profile-backend-only");
  if (!callback) {
    const origin = req.headers.get("origin");
    if ((origin && origin !== requestOrigin.origin) || req.headers.get("sec-fetch-site") === "cross-site") throw new BackendError(403, "cross-origin-request");
    if (req.method !== "GET" && req.headers.get("x-carebridge-request") !== "1") throw new BackendError(403, "request-header-required");
  }
}
function sessionFrom(req: Request, db: BackendDatabase) {
  const cookies = req.headers.get("cookie") ?? "";
  return db.session(cookies.split(";").map(c => c.trim()).find(c => c.startsWith(`${cookieName}=`))?.slice(cookieName.length+1));
}
async function body(req: Request, limit = 1024 * 1024): Promise<unknown> {
  if (!req.headers.get("content-type")?.startsWith("application/json")) throw new BackendError(415, "json-required");
  // Bound the streaming body, not just the caller-controlled Content-Length.
  const reader = req.body?.getReader();
  if (!reader) throw new BackendError(400, "body-required");
  let length = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new BackendError(413, "body-too-large"); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new BackendError(400, "invalid-json"); }
}

/** Dependency injection is only available to server tests, never request data. */
export async function handleBackend(req: Request, path: string[], database?: BackendDatabase, fitbitService?: FitbitService): Promise<NextResponse> {
  try {
    const endpoint = path.join("/");
    const callback = endpoint === "fitbit/callback" && req.method === "GET";
    requestBoundary(req, callback);
    const db = database ?? getDatabase();
    const fitbit = fitbitService ?? new FitbitService(db);
    if (endpoint === "session" && req.method === "POST") {
      let existing: Session | undefined;
      try { existing = sessionFrom(req, db); } catch { /* expired -> new controlled session */ }
      if (existing) return json(profileInfo(existing), 200, existing);
      const created = db.createSession();
      const response = json(profileInfo(created.session), 201, created.session);
      response.cookies.set(cookieName, created.token, { httpOnly: true, sameSite: "lax", secure: new URL(req.url).protocol === "https:", path: "/api/backend", maxAge: 12*3600 });
      return response;
    }
    const session = sessionFrom(req, db);
    if (endpoint === "session" && req.method === "GET") return json(profileInfo(session), 200, session);
    if (callback) {
      const url = new URL(req.url);
      const state = url.searchParams.get("state"); const code = url.searchParams.get("code");
      if (!state || !code) throw new BackendError(400, "oauth-not-authorized");
      await fitbit.callback(session, state, code);
      if (req.headers.get("accept")?.includes("text/html")) {
        return NextResponse.redirect(new URL("/my-health?fitbit=connected", req.url), 303);
      }
      return json({ userId: session.userId, connected: true, message: "Fitbit authorized. Return to HealthThread to sync." }, 200, session);
    }
    if (req.headers.get("x-carebridge-context") !== contextKey(session)) throw new BackendError(409, "profile-context-required-or-stale");
    if (endpoint === "profile" && req.method === "POST") {
      const input = z.object({ userId: ProfileId }).strict().parse(await body(req));
      const switched = db.switchProfile(session, input.userId);
      return json(profileInfo(switched), 200, switched);
    }
    const store = new ProfileStore(db, session.userId);
    const documents = new DocumentStore(db, session.userId);
    const run = <T>(fn: () => T) => db.inSession(session, fn);
    // Import can initialize an unseeded demo from its exact legacy snapshot.
    if (endpoint !== "demo/import") run(() => store.ensureDemo());
    if (req.method === "GET") {
      const result = run(() => {
        switch(endpoint) {
          case "documents": return { userId: session.userId, documents: documents.list() };
          case "documents/file": return documents.read(z.string().uuid().parse(new URL(req.url).searchParams.get("id")));
          case "health": return healthSnapshot(store);
          case "events": return { userId: store.userId, events: store.events() };
          case "metrics": return { userId: store.userId, metrics: store.metrics(), daily: store.daily() };
          case "timeline": return { userId: store.userId, entries: timeline(store) };
          case "summary": return { userId: store.userId, summary: store.summary() };
          case "settings": return { userId: store.userId, settings: store.settings() };
          case "ai-inbox": return { userId: store.userId, synthetic: store.userId === "alex-demo", candidates: store.aiInbox() };
          case "fitbit/status": return fitbit.status(session);
          case "speech": return { userId: store.userId, text: approvedSpeech(store, new URL(req.url).searchParams.get("section") ?? undefined) };
          default: throw new BackendError(404, "endpoint-not-found");
        }
      });
      return json(result, 200, session);
    }
    if (req.method !== "POST") throw new BackendError(405, "method-not-allowed");
    const input = await body(req, endpoint === "documents" ? 42 * 1024 * 1024 : undefined);
    run(() => {});
    let result: unknown;
    switch(endpoint) {
      case "documents": {
        result = run(() => ({ userId: session.userId, documents: documents.save(input) })); break;
      }
      case "events": {
        const data = z.object({ confirmed: z.literal(true), events: z.array(HealthEvent.extend({ userId: ProfileId.optional(), synthetic: z.boolean().optional() }).strict()).min(1).max(100) }).strict().parse(input);
        result = run(() => ({ userId: store.userId, events: store.addEvents(data.events, data.confirmed) })); break;
      }
      case "events/delete": {
        const data = Confirm.extend({ id: z.string().min(1) }).parse(input);
        run(() => store.deleteEvent(data.id, data.confirmed)); result = { ok: true }; break;
      }
      case "summary/generate": {
        z.object({}).strict().parse(input);
        run(() => {});
        result = await generateSummaryForProfile(store);
        // A profile switch while the provider was answering invalidates output.
        run(() => {});
        break;
      }
      case "summary/save": {
        const data = z.object({ confirmed: z.literal(true), approve: z.boolean().default(false), summary: OwnedSummary }).strict().parse(input);
        result = run(() => store.saveSummary(data.summary, data.approve)); break;
      }
      case "settings": {
        result = run(() => store.saveSettings(input)); break;
      }
      case "ai-inbox/stage": {
        const data = z.object({
          confirmedReview: z.literal(true),
          candidates: z.array(AIImportCandidateInput).min(1).max(100),
        }).strict().parse(input);
        result = run(() => ({ userId: store.userId, ...store.stageAIInbox(data.candidates, data.confirmedReview) })); break;
      }
      case "ai-inbox/confirm": {
        const data = Confirm.extend({ ids: z.array(z.string().min(1)).min(1).max(50) }).strict().parse(input);
        result = run(() => ({ userId: store.userId, ...store.confirmAIInbox([...new Set(data.ids)], data.confirmed) })); break;
      }
      case "ai-inbox/dismiss": {
        const data = Confirm.extend({ ids: z.array(z.string().min(1)).min(1).max(50) }).strict().parse(input);
        result = run(() => ({ userId: store.userId, removed: store.dismissAIInbox([...new Set(data.ids)], data.confirmed) })); break;
      }
      case "ai-inbox/demo-reset": {
        const data = Confirm.parse(input);
        result = run(() => ({ userId: store.userId, candidates: store.resetDemoAIInbox(data.confirmed) })); break;
      }
      case "demo/reset": {
        const data = Confirm.parse(input); run(() => store.resetDemo(data.confirmed)); result = { userId: store.userId, ok: true }; break;
      }
      case "demo/import": {
        const data = z.object({ confirmedSynthetic: z.literal(true), events: z.array(HealthEvent.extend({ userId: ProfileId.optional(), synthetic: z.boolean().optional() }).strict()).max(10000), metrics: z.array(DailyMetric.extend({ userId: ProfileId.optional(), synthetic: z.boolean().optional(), source: z.literal("demo") }).strict()).max(10000) }).strict().parse(input);
        result = run(() => store.importDemo(data, data.confirmedSynthetic)); break;
      }
      case "ask": {
        const data = z.object({ question: z.string().min(1).max(500) }).strict().parse(input);
        result = await ask(store, data.question); run(() => {}); break;
      }
      case "assistant": {
        const data = z.object({ text: z.string().min(1).max(4000), conversationId: z.string().uuid().optional() }).strict().parse(input);
        const id = data.conversationId ?? newRecordId();
        const previous = JSON.stringify(store.conversation(id));
        const response = await assistant(store, id, data.text);
        run(() => {
          if (JSON.stringify(store.conversation(id)) !== previous) throw new BackendError(409, "conversation-changed");
          store.saveConversation(id, response.messages);
        });
        result = { userId: store.userId, conversationId: id, ...response.turn }; break;
      }
      case "fitbit/start": {
        z.object({}).strict().parse(input); result = fitbit.start(session, new URL(req.url).origin); break;
      }
      case "fitbit/sync": {
        z.object({}).strict().parse(input); result = await fitbit.sync(session); break;
      }
      case "fitbit/disconnect": {
        Confirm.parse(input); run(() => store.disconnect()); result = { userId: store.userId, ok: true }; break;
      }
      default: throw new BackendError(404, "endpoint-not-found");
    }
    return json(result, 200, session);
  } catch (error) {
    const browserCallback =
      path.join("/") === "fitbit/callback" &&
      req.method === "GET" &&
      req.headers.get("accept")?.includes("text/html");
    if (browserCallback) {
      const code =
        error instanceof BackendError
          ? error.code
          : error instanceof z.ZodError
            ? "invalid-request-or-provider-data"
            : "backend-operation-failed";
      const target = new URL("/my-health", req.url);
      target.searchParams.set("fitbit", "error");
      target.searchParams.set("reason", code);
      return NextResponse.redirect(target, 303);
    }
    if (error instanceof BackendError) return json({ error: error.code }, error.status);
    if (error instanceof z.ZodError) return json({ error: "invalid-request-or-provider-data" }, 400);
    // Never leak SQL contents, original health text, OAuth tokens or provider bodies.
    return json({ error: "backend-operation-failed" }, 500);
  }
}
