import { createHash } from "node:crypto";

const EICAR = "EICAR-STANDARD-ANTIVIRUS-TEST-FILE";
const ACTIVE_PDF = /\/(?:JavaScript|JS|Launch|OpenAction|EmbeddedFile)\b/i;

export type InspectedDocument = {
  mimeType: string;
  sha256: string;
};

function starts(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function inspectJson(bytes: Buffer) {
  JSON.parse(bytes.toString("utf8"));
}

function inspectXml(bytes: Buffer) {
  const text = bytes.toString("utf8").trimStart();
  if (!text.startsWith("<") || /<!DOCTYPE|<!ENTITY/i.test(text)) {
    throw new Error("unsafe-xml-document");
  }
}

/**
 * Files remain staged in memory until this inspection passes. This blocks
 * extension spoofing, active PDF features, XML entities and the standard EICAR
 * test payload. Production deployments should additionally connect a managed
 * malware scanner before moving quarantined bytes into durable object storage.
 */
export function inspectDocument(
  extension: string,
  bytes: Buffer,
  declaredMime: string,
): InspectedDocument {
  const ascii = bytes.toString("latin1");
  if (ascii.includes(EICAR)) throw new Error("malware-signature-detected");

  if (extension === "pdf") {
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("file-signature-mismatch");
    if (ACTIVE_PDF.test(ascii)) throw new Error("active-pdf-content-rejected");
  } else if (extension === "png") {
    if (!starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) throw new Error("file-signature-mismatch");
  } else if (extension === "jpg" || extension === "jpeg") {
    if (!starts(bytes, [0xff, 0xd8, 0xff])) throw new Error("file-signature-mismatch");
  } else if (extension === "webp") {
    if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") throw new Error("file-signature-mismatch");
  } else if (extension === "heic" || extension === "heif") {
    const brand = bytes.subarray(4, 12).toString("ascii");
    if (!brand.includes("ftyp")) throw new Error("file-signature-mismatch");
  } else if (extension === "json") {
    inspectJson(bytes);
  } else if (extension === "xml") {
    inspectXml(bytes);
  } else {
    throw new Error("unsupported-document");
  }

  return {
    mimeType: declaredMime,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
