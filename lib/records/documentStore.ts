import type { ProfileId } from "@/lib/backend/client";

export type StoredHealthDocument = {
  userId: ProfileId; id: string; name: string; type: string; size: number; addedAt: string;
};

/** FileReader does not persist anything. The server owns confirmed originals.
 * Historical unowned IndexedDB files are intentionally left untouched. */
export function encodeDocument(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
}
