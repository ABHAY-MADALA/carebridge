import { z } from "zod";
import { BackendError, ProfileId } from "./schema";
import type { BackendDatabase } from "./database";

const MAX_FILE = 15 * 1024 * 1024;
const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", heic: "image/heic", heif: "image/heif", xml: "application/xml", json: "application/json" };
const Upload = z.object({
  confirmed: z.literal(true),
  files: z.array(z.object({ id: z.string().uuid(), name: z.string().min(1).max(255), data: z.string().min(4).max(4 * Math.ceil(MAX_FILE / 3)) }).strict()).min(1).max(20),
}).strict();

/** Originals only: no extraction, AI use or implicit creation of health facts. */
export class DocumentStore {
  readonly userId: ProfileId;
  constructor(private db: BackendDatabase, userId: ProfileId) { this.userId = ProfileId.parse(userId); }
  list() {
    return this.db.sql.prepare("SELECT id,name,type,added_at,length(bytes) AS size FROM documents WHERE user_id=? ORDER BY added_at DESC,id").all(this.userId).map(row => ({
      userId: this.userId, id: String(row.id), name: String(row.name), type: String(row.type), addedAt: String(row.added_at), size: Number(row.size),
    }));
  }
  read(id: string) {
    const row = this.db.sql.prepare("SELECT bytes FROM documents WHERE user_id=? AND id=?").get(this.userId, id);
    if (!row) throw new BackendError(404, "document-not-found");
    return { userId: this.userId, data: Buffer.from(row.bytes as Uint8Array).toString("base64") };
  }
  save(input: unknown) {
    // The demo must never acquire real uploaded medical records.
    if (this.userId !== "personal") throw new BackendError(403, "documents-personal-only");
    const { files } = Upload.parse(input);
    const addedAt = new Date().toISOString();
    let total = 0;
    const decoded = files.map(file => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!TYPES[extension] || /[\x00-\x1f/\\]/.test(file.name)) throw new BackendError(400, "unsupported-document");
      const bytes = Buffer.from(file.data, "base64");
      if (bytes.toString("base64") !== file.data || !bytes.length || bytes.length > MAX_FILE) throw new BackendError(400, "invalid-document-bytes");
      total += bytes.length;
      if (total > 30 * 1024 * 1024) throw new BackendError(413, "document-batch-too-large");
      return { ...file, bytes, type: TYPES[extension] };
    });
    for (const file of decoded) {
      const existing = this.db.sql.prepare("SELECT name,bytes FROM documents WHERE user_id=? AND id=?").get(this.userId, file.id);
      if (existing) {
        if (existing.name !== file.name || !Buffer.from(existing.bytes as Uint8Array).equals(file.bytes)) throw new BackendError(409, "document-id-conflict");
        continue;
      }
      this.db.sql.prepare("INSERT INTO documents VALUES (?,?,?,?,?,?)").run(this.userId, file.id, file.name, file.type, addedAt, file.bytes);
    }
    return this.list();
  }
}
