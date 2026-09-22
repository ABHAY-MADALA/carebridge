import { createHash, createHmac } from "node:crypto";
import type { BackendDatabase, Session } from "@/lib/backend/database";
import type { ProfileId } from "@/lib/backend/schema";
import { productionSecret } from "./config";

type AuditOutcome = "success" | "denied" | "failure";
type AuditRow = {
  id: number;
  occurred_at: string;
  actor_hash: string;
  profile_id: ProfileId | null;
  action: string;
  outcome: AuditOutcome;
  resource_hash: string | null;
  previous_hash: string;
  entry_hash: string;
};

function auditKey() {
  return productionSecret("HEALTHTHREAD_AUDIT_HMAC_KEY");
}

function digest(value: string) {
  const key = auditKey();
  return key
    ? createHmac("sha256", key).update(value).digest("hex")
    : createHash("sha256").update(value).digest("hex");
}

function canonical(row: Omit<AuditRow, "id" | "entry_hash">) {
  return JSON.stringify([
    row.occurred_at,
    row.actor_hash,
    row.profile_id,
    row.action,
    row.outcome,
    row.resource_hash,
    row.previous_hash,
  ]);
}

/** Append-only, PHI-free, hash-chained security audit record. */
export function appendSecurityAudit(
  db: BackendDatabase,
  session: Session | null,
  action: string,
  outcome: AuditOutcome,
  resourceId?: string,
) {
  const previous = db.sql.prepare("SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1").get();
  const row: Omit<AuditRow, "id" | "entry_hash"> = {
    occurred_at: new Date().toISOString(),
    actor_hash: digest(session?.key ?? "anonymous").slice(0, 32),
    profile_id: session?.userId ?? null,
    action: action.slice(0, 120),
    outcome,
    resource_hash: resourceId ? digest(resourceId) : null,
    previous_hash: previous ? String(previous.entry_hash) : "GENESIS",
  };
  const entryHash = digest(canonical(row));
  db.sql.prepare(`INSERT INTO audit_log
    (occurred_at,actor_hash,profile_id,action,outcome,resource_hash,previous_hash,entry_hash)
    VALUES (?,?,?,?,?,?,?,?)`).run(
      row.occurred_at,
      row.actor_hash,
      row.profile_id,
      row.action,
      row.outcome,
      row.resource_hash,
      row.previous_hash,
      entryHash,
    );
}

export function verifySecurityAudit(db: BackendDatabase) {
  const rows = db.sql.prepare("SELECT * FROM audit_log ORDER BY id").all() as unknown as AuditRow[];
  let previous = "GENESIS";
  for (const row of rows) {
    const candidate = {
      occurred_at: String(row.occurred_at),
      actor_hash: String(row.actor_hash),
      profile_id: row.profile_id,
      action: String(row.action),
      outcome: row.outcome,
      resource_hash: row.resource_hash ? String(row.resource_hash) : null,
      previous_hash: String(row.previous_hash),
    };
    if (candidate.previous_hash !== previous || digest(canonical(candidate)) !== row.entry_hash) {
      return { valid: false, entries: rows.length, brokenAt: row.id };
    }
    previous = String(row.entry_hash);
  }
  return { valid: true, entries: rows.length, brokenAt: null };
}
