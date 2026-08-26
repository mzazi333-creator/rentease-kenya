import { randomUUID } from "crypto";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";

/**
 * Storage abstraction. Landlord/building/unit images are stored via this
 * interface so the backing store can be swapped later (e.g. S3 / MinIO)
 * without touching business logic.
 */

export interface StoredFile {
  name: string;
  mimeType: string;
  size: number;
  /** Raw bytes — read from a File in server actions. */
  buffer: Buffer;
}

export interface StorageService {
  save(file: StoredFile, folder: string): Promise<string>;
  delete(url: string): Promise<void>;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

export function validateImageFile(file: StoredFile): void {
  if (!ALLOWED_MIME.has(file.mimeType)) {
    throw new FileValidationError(
      "Unsupported file type. Please upload a JPG, PNG, WEBP or GIF image."
    );
  }
  if (file.size > MAX_SIZE) {
    throw new FileValidationError("Image is too large. Maximum size is 5 MB.");
  }
}

class LocalStorageService implements StorageService {
  private readonly uploadRoot = path.join(process.cwd(), "public", "uploads");

  async save(file: StoredFile, folder: string): Promise<string> {
    validateImageFile(file);
    const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "");
    const dir = path.join(this.uploadRoot, safeFolder);
    await mkdir(dir, { recursive: true });
    const ext = extForMime(file.mimeType);
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const full = path.join(dir, filename);
    await writeFile(full, file.buffer);
    return `/uploads/${safeFolder}/${filename}`;
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith("/uploads/")) return;
    const full = path.join(process.cwd(), "public", url);
    try {
      await rm(full, { force: true });
    } catch {
      // ignore — best-effort cleanup
    }
  }
}

function extForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}

let instance: StorageService | null = null;

/**
 * Images are stored on the local filesystem under public/uploads/. The
 * StorageService abstraction remains so a cloud driver can be added later
 * without touching business logic — no storage configuration is required.
 */
export function getStorage(): StorageService {
  if (!instance) instance = new LocalStorageService();
  return instance;
}

/** Convert a server-action File to a StoredFile (already validated for type/size by the client too). */
export async function fileToStoredFile(file: File): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return { name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, buffer };
}
