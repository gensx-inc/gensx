import * as fs from "node:fs/promises";
import * as path from "node:path";

import { fromBase64UrlSafe, toBase64UrlSafe } from "../utils/base64.js";
import {
  FileSystemKVStorageOptions,
  KV,
  KVStorage,
  ListKeysResponse,
} from "./types.js";

class FileSystemKV<T> implements KV<T> {
  private filePath: string;

  constructor(root: string, key: string) {
    const safeKey = key.replace(/^\/+|\/+$/g, "");
    this.filePath = path.join(root, `${safeKey}.json`);
  }

  async get(): Promise<T | null> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const { value, expiresAt } = JSON.parse(content) as {
        value: T;
        expiresAt?: number;
      };
      if (expiresAt && Date.now() > expiresAt) {
        await this.delete();
        return null;
      }
      return value;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async set(value: T, options: { ttl?: number } = {}): Promise<void> {
    const record = {
      value,
      ...(options.ttl ? { expiresAt: Date.now() + options.ttl * 1000 } : {}),
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(record), "utf8");
  }

  async delete(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      const data = await this.get();
      return data !== null;
    } catch {
      return false;
    }
  }
}

export class FileSystemKVStorage implements KVStorage {
  private rootDir: string;
  private kvs = new Map<string, FileSystemKV<unknown>>();

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    void this.ensureRootDir();
  }

  private async ensureRootDir(): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
  }

  getKV<T>(key: string): KV<T> {
    let kv = this.kvs.get(key) as FileSystemKV<T> | undefined;
    if (!kv) {
      kv = new FileSystemKV<T>(this.rootDir, key);
      this.kvs.set(key, kv as FileSystemKV<unknown>);
    }
    return kv;
  }

  async listKeys(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ListKeysResponse> {
    const prefix = options?.prefix ?? "";
    const limit = options?.limit ?? 100;
    let files = await fs.readdir(this.rootDir);
    files = files.filter((f) => f.endsWith(".json"));
    files.sort();

    if (options?.cursor) {
      const last = fromBase64UrlSafe(options.cursor);
      const idx = files.findIndex((f) => f > last);
      files = idx === -1 ? [] : files.slice(idx);
    }

    const page = files.filter((f) => f.startsWith(prefix)).slice(0, limit);
    const nextCursor =
      page.length === limit
        ? toBase64UrlSafe(page[page.length - 1])
        : undefined;

    const keys = await Promise.all(
      page.map(async (file) => {
        const key = file.slice(0, -5);
        const kv = this.getKV(key);
        const content = await kv.get();
        const exists = content !== null;
        let expiresAt: Date | undefined;
        if (exists) {
          const raw = JSON.parse(
            await fs.readFile(path.join(this.rootDir, file), "utf8"),
          ) as { expiresAt?: number };
          if (raw.expiresAt) expiresAt = new Date(raw.expiresAt);
        }
        return { key, expiresAt };
      }),
    );

    return { keys, ...(nextCursor && { nextCursor }) };
  }

  async deleteKey(key: string): Promise<{ deleted: boolean }> {
    const kv = this.getKV(key);
    const existed = await kv.exists();
    await kv.delete();
    return { deleted: existed };
  }

  async keyExists(key: string): Promise<boolean> {
    const kv = this.getKV(key);
    return kv.exists();
  }
}

export function createFileSystemKVStorage(
  options: FileSystemKVStorageOptions,
): FileSystemKVStorage {
  const rootDir = options.rootDir ?? path.join(process.cwd(), ".gensx", "kv");
  return new FileSystemKVStorage(rootDir);
}
