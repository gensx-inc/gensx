import { KV, KVStorage } from "./types.js";

export class RemoteKV<T> implements KV<T> {
  async get(): Promise<T | null> {
    return Promise.reject(new Error("Remote KV not implemented"));
  }
  async set(): Promise<void> {
    return Promise.reject(new Error("Remote KV not implemented"));
  }
  async delete(): Promise<void> {
    return Promise.reject(new Error("Remote KV not implemented"));
  }
  async exists(): Promise<boolean> {
    return Promise.reject(new Error("Remote KV not implemented"));
  }
}

export class RemoteKVStorage implements KVStorage {
  constructor(project: string, environment: string) {
    void project;
    void environment;
  }
  getKV<T>(_key: string): KV<T> {
    return new RemoteKV<T>();
  }
  async listKeys(): Promise<{ keys: { key: string; expiresAt?: Date }[] }> {
    return Promise.reject(new Error("Remote KV not implemented"));
  }
  async deleteKey(_key: string): Promise<{ deleted: boolean }> {
    return Promise.reject(new Error("Remote KV not implemented"));
  }
  async keyExists(_key: string): Promise<boolean> {
    return Promise.reject(new Error("Remote KV not implemented"));
  }
}
