import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { HealthEvent, DailyMetric, DoctorSummary, ChatMessage } from "@/lib/schema";
import { buildEvents, buildMetrics } from "@/lib/store/seed";
import { dateKey } from "@/lib/dates";
import { summaryHasContent } from "@/lib/health/summary";
import { BackendDatabase } from "./database";
import { ProfileId, OwnedEvent, OwnedDaily, OwnedSummary, HealthMetric, PatientSettings, BackendError, requirePersonal } from "./schema";

export const Connection = z.object({
  userId: z.literal("personal"), accessToken: z.string().min(1), refreshToken: z.string().nullable(),
  expiresAt: z.number().finite(), authorizedAt: z.string(), lastSyncAt: z.string().nullable(), generation: z.string(),
});
export type Connection = z.infer<typeof Connection>;
const Conversation = z.object({ userId: ProfileId, messages: z.array(ChatMessage) });
type Kind = "event" | "metric" | "daily" | "summary" | "settings" | "metadata" | "conversation";

/** Construct only after resolving a controlled server session. Every read and
 * write includes user_id, even updates by an otherwise unique record ID. */
export class ProfileStore {
  readonly userId: ProfileId;
  constructor(readonly db: BackendDatabase, userId: ProfileId) { this.userId = ProfileId.parse(userId); }
  private owned(raw: unknown): asserts raw is Record<string, unknown> {
    if (!raw || typeof raw !== "object") throw new BackendError(400, "invalid-record");
    const record = raw as Record<string, unknown>;
    if (record.userId !== undefined && record.userId !== this.userId) throw new BackendError(403, "ownership-mismatch");
    if (record.synthetic !== undefined && record.synthetic !== (this.userId === "alex-demo")) throw new BackendError(403, "synthetic-mismatch");
  }
  private stamp(raw: object) { return { ...raw, userId: this.userId, synthetic: this.userId === "alex-demo" }; }
  private list<S extends z.ZodTypeAny>(kind: Kind, schema: S): z.output<S>[] {
    return this.db.sql.prepare("SELECT data FROM records WHERE user_id=? AND kind=? ORDER BY id").all(this.userId, kind).map(row => {
      const data = JSON.parse(String(row.data));
      if (data.userId !== this.userId) throw new BackendError(500, "corrupt-record-ownership");
      return schema.parse(data);
    });
  }
  private get(kind: Kind, id: string): unknown | null {
    const row = this.db.sql.prepare("SELECT data FROM records WHERE user_id=? AND kind=? AND id=?").get(this.userId, kind, id);
    if (!row) return null;
    const data = JSON.parse(String(row.data));
    if (data.userId !== this.userId) throw new BackendError(500, "corrupt-record-ownership");
    return data;
  }
  private put(kind: Kind, id: string, data: object) {
    this.owned(data);
    this.db.sql.prepare("INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(user_id,kind,id) DO UPDATE SET data=excluded.data")
      .run(this.userId, kind, id, JSON.stringify({ ...data, userId: this.userId }));
  }
  private remove(kind: Kind, id: string) { this.db.sql.prepare("DELETE FROM records WHERE user_id=? AND kind=? AND id=?").run(this.userId, kind, id); }
  private invalidateSummary() { this.remove("summary", "current"); }

  ensureDemo() {
    if (this.userId !== "alex-demo" || this.get("metadata", "seeded")) return;
    for (const event of buildEvents()) this.put("event", event.id, OwnedEvent.parse(this.stamp(event)));
    for (const daily of buildMetrics()) this.put("daily", daily.date, OwnedDaily.parse(this.stamp(daily)));
    this.put("metadata", "seeded", { seededAt: new Date().toISOString() });
  }
  events() { return this.list("event", OwnedEvent).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)); }
  metrics() { return this.list("metric", HealthMetric); }
  daily() {
    const rows = this.list("daily", OwnedDaily);
    if (this.userId === "alex-demo") return rows;
    const dates = new Map(rows.map(row => [row.date, row]));
    // Patient reports stay events; these two daily aggregates are derived only
    // from this profile's confirmed symptom entries, never provider estimates.
    for (const e of this.events()) {
      if (e.severity === null || !["pain", "fatigue"].includes(e.category)) continue;
      const date = dateKey(new Date(e.occurredAt));
      const row = dates.get(date) ?? OwnedDaily.parse(this.stamp({ date, source: "patient", sleepMinutes: null, restingHeartRate: null, steps: null, painLevel: null, fatigueLevel: null, cycleDay: null, cyclePhase: null }));
      const key = e.category === "pain" ? "painLevel" : "fatigueLevel";
      row[key] = Math.max(row[key] ?? 0, e.severity);
      dates.set(date, row);
    }
    return [...dates.values()].sort((a,b) => a.date.localeCompare(b.date));
  }
  addEvents(input: unknown[], confirmed: boolean) {
    if (!confirmed) throw new BackendError(400, "confirmation-required");
    const events = input.map(raw => {
      this.owned(raw);
      const event = OwnedEvent.parse(this.stamp(HealthEvent.parse(raw)));
      if (!Number.isFinite(Date.parse(event.occurredAt)) || !Number.isFinite(Date.parse(event.recordedAt))) throw new BackendError(400, "invalid-event-time");
      if (event.id.startsWith("seed-")) throw new BackendError(400, "reserved-event-id");
      return event;
    });
    for (const event of events) {
      const existing = this.get("event", event.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(event)) throw new BackendError(409, "event-id-conflict");
    }
    for (const event of events) this.put("event", event.id, event);
    this.invalidateSummary();
    return events;
  }
  deleteEvent(id: string, confirmed: boolean) {
    if (!confirmed) throw new BackendError(400, "confirmation-required");
    if (!this.get("event", id)) throw new BackendError(404, "event-not-found");
    this.remove("event", id); this.invalidateSummary();
  }
  summary() { const value = this.get("summary", "current"); return value ? OwnedSummary.parse(value) : null; }
  saveSummary(input: unknown, approved: boolean) {
    if (this.events().length === 0 && this.daily().length === 0) {
      throw new BackendError(409, "summary-source-records-required");
    }
    this.owned(input);
    const summary = OwnedSummary.parse(this.stamp({ ...DoctorSummary.parse(input), approved, approvedAt: approved ? new Date().toISOString() : null }));
    if (!summaryHasContent(summary)) throw new BackendError(409, "summary-content-required");
    this.put("summary", "current", summary); return summary;
  }
  settings() { return PatientSettings.parse(this.get("settings", "current") ? this.stripOwner(this.get("settings", "current")) : {}); }
  private stripOwner(raw: unknown) { const { userId: _id, ...rest } = raw as Record<string, unknown>; return rest; }
  saveSettings(input: unknown) { const settings = PatientSettings.parse(input); this.put("settings", "current", settings); return settings; }
  conversation(id: string) {
    const record = this.get("conversation", id);
    return record ? Conversation.parse(record).messages : [];
  }
  saveConversation(id: string, messages: z.infer<typeof ChatMessage>[]) { this.put("conversation", id, Conversation.parse({ userId: this.userId, messages })); }
  connection() {
    requirePersonal(this.userId);
    const row = this.db.sql.prepare("SELECT data FROM connections WHERE user_id=?").get(this.userId);
    return row ? Connection.parse(JSON.parse(String(row.data))) : null;
  }
  saveConnection(value: Connection) {
    requirePersonal(this.userId);
    const connection = Connection.parse(value);
    this.db.sql.prepare("INSERT INTO connections VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data").run(this.userId, JSON.stringify(connection));
  }
  disconnect() {
    requirePersonal(this.userId);
    this.db.sql.prepare("DELETE FROM connections WHERE user_id=?").run(this.userId);
    this.db.sql.prepare("DELETE FROM oauth WHERE user_id=?").run(this.userId);
  }
  importFitbit(points: Omit<HealthMetric, "userId" | "synthetic">[], generation: string, syncedAt: string) {
    requirePersonal(this.userId);
    const connection = this.connection();
    if (!connection || connection.generation !== generation) throw new BackendError(409, "connection-changed");
    const parsed = points.map(p => { this.owned(p); return HealthMetric.parse(this.stamp(p)); });
    if (parsed.some(p => p.source !== "fitbit")) throw new BackendError(400, "invalid-fitbit-source");
    const existing = new Map(this.list("daily", OwnedDaily).map(m => [m.date, m]));
    for (const metric of parsed) {
      this.put("metric", metric.id, metric);
      const row = existing.get(metric.date) ?? OwnedDaily.parse(this.stamp({ date: metric.date, source: "fitbit", sleepMinutes: null, restingHeartRate: null, steps: null, painLevel: null, fatigueLevel: null, cycleDay: null, cyclePhase: null }));
      row[metric.type] = metric.value;
      existing.set(metric.date, row);
    }
    for (const row of existing.values()) this.put("daily", row.date, row);
    this.saveConnection({ ...connection, lastSyncAt: syncedAt });
    this.invalidateSummary();
  }
  resetDemo(confirmed: boolean) {
    if (this.userId !== "alex-demo") throw new BackendError(403, "demo-reset-only");
    if (!confirmed) throw new BackendError(400, "confirmation-required");
    this.db.sql.prepare("DELETE FROM records WHERE user_id=?").run(this.userId);
    this.ensureDemo();
  }
  /** Explicitly confirmed synthetic snapshot only. No bulk automatic import of
   * ambiguous legacy browser records, Fitbit rows, or preapproved summaries. */
  importDemo(input: { events: HealthEvent[]; metrics: DailyMetric[] }, confirmedSynthetic: boolean) {
    if (this.userId !== "alex-demo" || !confirmedSynthetic) throw new BackendError(403, "synthetic-confirmation-required");
    for (const raw of [...input.events, ...input.metrics]) this.owned(raw);
    const events = HealthEvent.array().parse(input.events);
    const metrics = DailyMetric.array().parse(input.metrics);
    if (metrics.some(m => m.source !== "demo")) throw new BackendError(400, "real-data-in-demo-import");
    const digest = createHash("sha256").update(JSON.stringify({ events, metrics })).digest("hex");
    if (this.get("metadata", `import-${digest}`)) return { imported: false, digest };
    // Import is lossless/additive. Conflicting IDs must be resolved explicitly,
    // never overwritten, including seed rows from a different demo date.
    for (const e of events) {
      const prior = this.get("event", e.id);
      if (prior && JSON.stringify(HealthEvent.parse(prior)) !== JSON.stringify(e)) throw new BackendError(409, "migration-event-conflict");
    }
    for (const m of metrics) {
      const prior = this.get("daily", m.date);
      if (prior && JSON.stringify(DailyMetric.parse(prior)) !== JSON.stringify(m)) throw new BackendError(409, "migration-metric-conflict");
    }
    for (const e of events) this.put("event", e.id, OwnedEvent.parse(this.stamp(e)));
    for (const m of metrics) this.put("daily", m.date, OwnedDaily.parse(this.stamp(m)));
    this.put("metadata", `import-${digest}`, { importedAt: new Date().toISOString() });
    this.put("metadata", "seeded", { importedAt: new Date().toISOString() });
    this.invalidateSummary();
    return { imported: true, digest };
  }
}

export const newRecordId = () => randomUUID();
