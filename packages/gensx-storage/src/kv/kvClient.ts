import { join } from "path";

import { getProjectAndEnvironment } from "../utils/config.js";
import { createFileSystemKVStorage } from "./filesystem.js";
import { RemoteKVStorage } from "./remote.js";
import { KV, KVStorage, KVStorageKind, KVStorageOptions } from "./types.js";

export class KVClient {
  private storage: KVStorage;

  constructor(options: KVStorageOptions = {}) {
    const kind: KVStorageKind =
      options.kind ??
      (process.env.GENSX_RUNTIME === "cloud" ? "cloud" : "filesystem");

    if (kind === "filesystem") {
      const rootDir =
        options.kind === "filesystem" && options.rootDir
          ? options.rootDir
          : join(process.cwd(), ".gensx", "kv");
      this.storage = createFileSystemKVStorage({ rootDir });
    } else {
      const { project, environment } = getProjectAndEnvironment({
        project: options.project,
        environment: options.environment,
      });
      this.storage = new RemoteKVStorage(project, environment);
    }
  }

  getKV<T>(key: string): KV<T> {
    return this.storage.getKV<T>(key);
  }

  async listKeys(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    keys: { key: string; expiresAt?: Date }[];
    nextCursor?: string;
  }> {
    return this.storage.listKeys(options);
  }

  async deleteKey(key: string): Promise<{ deleted: boolean }> {
    return this.storage.deleteKey(key);
  }

  async keyExists(key: string): Promise<boolean> {
    return this.storage.keyExists(key);
  }
}
