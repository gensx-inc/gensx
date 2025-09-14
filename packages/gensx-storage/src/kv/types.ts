export interface KVSetOptions {
  ttl?: number;
}

export interface KV<T = unknown> {
  get(): Promise<T | null>;
  set(value: T, options?: KVSetOptions): Promise<void>;
  delete(): Promise<void>;
  exists(): Promise<boolean>;
}

export interface ListKeysResponse {
  keys: { key: string; expiresAt?: Date }[];
  nextCursor?: string;
}

export interface KVStorage {
  getKV<T>(key: string): KV<T>;
  listKeys(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ListKeysResponse>;
  deleteKey(key: string): Promise<{ deleted: boolean }>;
  keyExists(key: string): Promise<boolean>;
}

export type KVStorageKind = "filesystem" | "cloud";

export interface BaseKVStorageOptions {
  kind?: KVStorageKind;
  project?: string;
  environment?: string;
}

export interface FileSystemKVStorageOptions extends BaseKVStorageOptions {
  kind?: "filesystem";
  rootDir?: string;
}

export interface CloudKVStorageOptions extends BaseKVStorageOptions {
  kind?: "cloud";
}

export type KVStorageOptions =
  | FileSystemKVStorageOptions
  | CloudKVStorageOptions;
