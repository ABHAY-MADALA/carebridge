export type StoredHealthDocument = {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
  file: Blob;
};

const DB_NAME = "carebridge-health-records";
const STORE_NAME = "documents";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open record storage"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Record storage failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Record storage was cancelled"));
  });
}

export async function listHealthDocuments(): Promise<StoredHealthDocument[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    const records = await new Promise<StoredHealthDocument[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredHealthDocument[]);
      request.onerror = () => reject(request.error ?? new Error("Could not load records"));
    });
    return records.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  } finally {
    database.close();
  }
}

export async function saveHealthDocuments(files: File[]): Promise<StoredHealthDocument[]> {
  const database = await openDatabase();
  const addedAt = new Date().toISOString();
  const records = files.map<StoredHealthDocument>((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    addedAt,
    file,
  }));

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    records.forEach((record) => store.put(record));
    await transactionComplete(transaction);
    return records;
  } finally {
    database.close();
  }
}
