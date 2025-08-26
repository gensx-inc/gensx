# Agents Notes: Component Retry Support

- Components now accept `retry` configuration at declaration time and runtime via `ComponentOpts.retry`.
- Fields:
  - `enabled`: boolean to enable retries
  - `maxAttempts`: total attempts including the first
  - `strategy`:
    - `type`: "fixed" | "exponential"
    - `delayMs` (fixed)
    - `initialDelayMs`, `factor`, `maxDelayMs`, `jitter` (exponential)
  - `retryOn(error, attempt)`: predicate to decide retryable errors
- Execution behavior:
  - Preserves synchronous success shape on first call.
  - On failure, retries with configured backoff; updates checkpoint metadata:
    - `metadata.retry`: { enabled, maxAttempts, strategy, attempts[], currentAttempt, failedAttempt, nextDelayMs, lastError }
- Usage examples:

```ts
const C = Component("C", fn, { retry: { enabled: true, maxAttempts: 3, strategy: { type: "exponential", initialDelayMs: 300, factor: 2 } } });
await C(props, { retry: { enabled: true, maxAttempts: 5, strategy: { type: "fixed", delayMs: 200, jitter: false } } });
```
