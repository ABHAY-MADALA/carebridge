import { DatabaseSync } from "node:sqlite";
import { mkdirSync, openSync, closeSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { ProfileId, BackendError } from "./schema";

export type Session = { key: string; userId: ProfileId; revision: number; expiresAt: number };
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Local single-host storage. SQLite transactions also serialize separate Node
 * workers; no process-global active user or read-all-health-data method exists. */
export class BackendDatabase {
  readonly sql: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") {
      mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
      closeSync(openSync(filename, "a", 0o600));
      chmodSync(filename, 0o600);
    }
    this.sql = new DatabaseSync(filename);
    this.sql.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY CHECK(id IN ('personal','alex-demo')));
      INSERT OR IGNORE INTO profiles VALUES ('personal'), ('alex-demo');
      CREATE TABLE IF NOT EXISTS records (
        user_id TEXT NOT NULL REFERENCES profiles(id),
        kind TEXT NOT NULL CHECK(kind IN ('event','metric','daily','summary','settings','metadata','conversation')),
        id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(user_id,kind,id));
      CREATE TABLE IF NOT EXISTS connections (
        user_id TEXT PRIMARY KEY REFERENCES profiles(id) CHECK(user_id='personal'),
        data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (
        key TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id),
        revision INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth (
        state TEXT PRIMARY KEY, session_key TEXT NOT NULL REFERENCES sessions(key),
        user_id TEXT NOT NULL CHECK(user_id='personal'), revision INTEGER NOT NULL,
        verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);
    `);
  }
  close() { this.sql.close(); }
  transaction<T>(fn: () => T): T {
    this.sql.exec("BEGIN IMMEDIATE");
    try { const result = fn(); this.sql.exec("COMMIT"); return result; }
    catch (error) { this.sql.exec("ROLLBACK"); throw error; }
  }
  createSession(): { token: string; session: Session } {
    const token = randomBytes(32).toString("hex");
    const session = { key: hash(token), userId: "personal" as const, revision: 1, expiresAt: Date.now() + 12 * 3600000 };
    this.sql.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(session.key, session.userId, session.revision, session.expiresAt);
    return { token, session };
  }
  session(token: string | undefined): Session {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new BackendError(401, "session-required");
    const row = this.sql.prepare("SELECT * FROM sessions WHERE key=? AND expires_at>?").get(hash(token), Date.now());
    if (!row) throw new BackendError(401, "session-expired");
    return { key: String(row.key), userId: ProfileId.parse(row.user_id), revision: Number(row.revision), expiresAt: Number(row.expires_at) };
  }
  assertCurrent(s: Session) {
    const row = this.sql.prepare("SELECT 1 FROM sessions WHERE key=? AND user_id=? AND revision=? AND expires_at>?").get(s.key, s.userId, s.revision, Date.now());
    if (!row) throw new BackendError(409, "profile-context-changed");
  }
  switchProfile(s: Session, id: ProfileId): Session {
    return this.transaction(() => {
      this.assertCurrent(s);
      this.sql.prepare("UPDATE sessions SET user_id=?,revision=revision+1 WHERE key=?").run(ProfileId.parse(id), s.key);
      this.sql.prepare("DELETE FROM oauth WHERE session_key=?").run(s.key);
      return { ...s, userId: id, revision: s.revision + 1 };
    });
  }
  /** Guard once more inside the transaction after any awaited provider calls. */
  inSession<T>(s: Session, fn: () => T): T {
    return this.transaction(() => { this.assertCurrent(s); return fn(); });
  }
}

let database: BackendDatabase | undefined;
export function getDatabase() {
  return database ??= new BackendDatabase(process.env.CAREBRIDGE_DATABASE_PATH ?? resolve(process.cwd(), ".carebridge-data/carebridge.sqlite"));
}
