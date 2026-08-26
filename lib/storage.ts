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

class S3StorageService implements StorageService {
  async save(_file: StoredFile, _folder: string): Promise<string> {
    throw new Error(
      "S3 storage driver requires STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET and STORAGE_PUBLIC_URL to be configured. For local development use STORAGE_DRIVER=local."
    );
  }
  async delete(_url: string): Promise<void> {
    // no-op when unconfigured
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

export function getStorage(): StorageService {
  if (instance) return instance;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  instance = driver === "s3" ? new S3StorageService() : new LocalStorageService();
  return instance;
}

/** Convert a server-action File to a StoredFile (already validated for type/size by the client too). */
export async function fileToStoredFile(file: File): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return { name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, buffer };
}
