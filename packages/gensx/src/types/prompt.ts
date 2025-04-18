export interface PromptModule {
  prompt<T>(options: unknown): Promise<T>;
}
