import { randomUUID } from "node:crypto";
import { generatePkce, generateState, buildAuthUrl, type GoogleHealthConfig } from "@/lib/health/googleHealth";
import { dateKey, startOfToday, addDays } from "@/lib/dates";
import { BackendDatabase, type Session } from "./database";
import { ProfileStore, Connection } from "./store";
import { BackendError, requirePersonal } from "./schema";
import { fitbitConfig, googleFitbitProvider, type FitbitProvider } from "./fitbit-provider";

export class FitbitService {
  constructor(readonly db: BackendDatabase, readonly provider: FitbitProvider = googleFitbitProvider, readonly config: GoogleHealthConfig | null = fitbitConfig()) {}
  status(s: Session) {
    if (s.userId === "alex-demo") return { userId: s.userId, configured: false, connected: false, allowed: false, lastSyncAt: null, reason: "demo-synthetic-only" };
    const connection = new ProfileStore(this.db, s.userId).connection();
    const connected = !!connection && (connection.expiresAt > Date.now() || !!connection.refreshToken);
    return { userId: s.userId, configured: !!this.config, allowed: true, connected, lastSyncAt: connection?.lastSyncAt ?? null, reason: connection && !connected ? "reauth-required" : null };
  }
  start(s: Session, origin: string) {
    requirePersonal(s.userId);
    if (!this.config || new URL(this.config.redirectUri).origin !== origin) throw new BackendError(503, "fitbit-not-configured");
    const { verifier, challenge } = generatePkce(); const state = generateState();
    this.db.inSession(s, () => {
      this.db.sql.prepare("DELETE FROM oauth WHERE session_key=?").run(s.key);
      this.db.sql.prepare("INSERT INTO oauth VALUES (?,?,?,?,?,?)").run(state, s.key, s.userId, s.revision, verifier, Date.now()+600000);
    });
    const url = new URL(buildAuthUrl(this.config, state, challenge));
    url.searchParams.set("scope", `${url.searchParams.get("scope")} https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`);
    return { authorizationUrl: url.toString() };
  }
  async callback(s: Session, state: string, code: string) {
    requirePersonal(s.userId);
    if (!this.config) throw new BackendError(503, "fitbit-not-configured");
    const pending = this.db.sql.prepare("SELECT verifier FROM oauth WHERE state=? AND session_key=? AND user_id=? AND revision=? AND expires_at>?").get(state, s.key, s.userId, s.revision, Date.now());
    if (!pending) throw new BackendError(400, "invalid-oauth-state");
    const tokens = await this.provider.exchange(this.config, code, String(pending.verifier));
    this.db.inSession(s, () => {
      const consumed = this.db.sql.prepare("DELETE FROM oauth WHERE state=? AND session_key=? AND revision=? AND expires_at>?").run(state, s.key, s.revision, Date.now());
      if (!consumed.changes) throw new BackendError(409, "oauth-cancelled-or-consumed");
      new ProfileStore(this.db, s.userId).saveConnection(Connection.parse({ ...tokens, userId: s.userId, authorizedAt: new Date().toISOString(), lastSyncAt: null, generation: randomUUID() }));
    });
  }
  async sync(s: Session) {
    requirePersonal(s.userId);
    if (!this.config) throw new BackendError(503, "fitbit-not-configured");
    const store = new ProfileStore(this.db, s.userId);
    const connection = this.db.inSession(s, () => store.connection());
    if (!connection) throw new BackendError(409, "fitbit-not-connected");
    let tokens = connection;
    try {
      if (tokens.expiresAt <= Date.now()+30000) {
        if (!tokens.refreshToken) throw new BackendError(401, "reauth-required");
        tokens = Connection.parse({ ...tokens, ...await this.provider.refresh(this.config, tokens.refreshToken) });
      }
      const today = startOfToday();
      const result = await this.provider.measurements(tokens.accessToken, dateKey(addDays(today,-30)), dateKey(addDays(today,1)));
      this.db.inSession(s, () => {
        if (store.connection()?.generation !== connection.generation) throw new BackendError(409, "connection-changed");
        store.saveConnection(tokens);
        if (result.points.length) store.importFitbit(result.points, connection.generation, new Date().toISOString());
        // Serialize in-flight syncs even when both began on the same token.
        store.saveConnection({ ...store.connection()!, generation: randomUUID() });
      });
      return { userId: s.userId, ok: result.points.length > 0, metricsCount: result.points.length,
        unavailable: result.unavailable, lastSyncAt: store.connection()?.lastSyncAt ?? null,
        reason: result.points.length ? null : "no-supported-measurements" };
    } catch (error) {
      if (error instanceof BackendError && error.status === 401) {
        this.db.inSession(s, () => { if (store.connection()?.generation === connection.generation) store.disconnect(); });
      }
      throw error;
    }
  }
}
