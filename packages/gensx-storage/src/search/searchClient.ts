import { SearchStorage } from "./remote.js";
import {
  DeleteNamespaceResult,
  EnsureNamespaceResult,
  Namespace,
} from "./types.js";

/**
 * Client for interacting with search functionality outside of JSX context
 */
export class SearchClient {
  private storage: SearchStorage;

  constructor() {
    this.storage = new SearchStorage();
  }

  /**
   * Get a namespace (ensures it exists first)
   * @param name The namespace name
   * @returns A Promise resolving to a Namespace
   */
  async getNamespace(name: string): Promise<Namespace> {
    if (!this.storage.hasEnsuredNamespace(name)) {
      await this.storage.ensureNamespace(name);
    }
    return this.storage.getNamespace(name);
  }

  /**
   * Ensure a namespace exists
   * @param name The namespace name
   * @returns A Promise resolving to the ensure result
   */
  async ensureNamespace(name: string): Promise<EnsureNamespaceResult> {
    return this.storage.ensureNamespace(name);
  }

  /**
   * List all namespaces
   * @param options Options for listing namespaces
   * @returns A Promise resolving to an array of namespace names
   */
  async listNamespaces(options?: { prefix?: string }): Promise<string[]> {
    return this.storage.listNamespaces(options);
  }

  /**
   * Delete a namespace
   * @param name The namespace name
   * @returns A Promise resolving to the deletion result
   */
  async deleteNamespace(name: string): Promise<DeleteNamespaceResult> {
    return this.storage.deleteNamespace(name);
  }

  /**
   * Check if a namespace exists
   * @param name The namespace name
   * @returns A Promise resolving to a boolean indicating if the namespace exists
   */
  async namespaceExists(name: string): Promise<boolean> {
    return this.storage.namespaceExists(name);
  }
}
