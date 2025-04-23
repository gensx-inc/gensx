import type { Streamable } from "./types.js";

// Helper to check if something is a streamable value
export function isStreamable(value: unknown): value is Streamable {
  return (
    typeof value === "object" &&
    value !== null &&
    // Verify that it's an async iterator
    "next" in value &&
    typeof (value as AsyncIterator<string>).next === "function" &&
    // Verify that it has the async iterator symbol
    ((Symbol.asyncIterator in value &&
      typeof value[Symbol.asyncIterator] === "function") ||
      (Symbol.iterator in value &&
        typeof value[Symbol.iterator] === "function"))
  );
}

export function onStreamComplete(
  originalStream: Streamable,
  fn: (finalResult: unknown) => Promise<void> | void,
): Streamable {
  let collector = ""; // right now we only support strings, so we can concatenate them
  const wrappedStream: AsyncIterableIterator<string> = {
    async next(): Promise<IteratorResult<string>> {
      try {
        // Handle both async and sync iterators
        const iterator: AsyncIterator<string> =
          Symbol.asyncIterator in originalStream
            ? originalStream[Symbol.asyncIterator]()
            : {
                async next(): Promise<IteratorResult<string>> {
                  const syncResult = originalStream[Symbol.iterator]().next();
                  return await Promise.resolve({
                    value: String(syncResult.value ?? ""),
                    done: Boolean(syncResult.done),
                  });
                },
              };

        const iterResult = await iterator.next();
        collector += String(iterResult.value ?? "");
        if (iterResult.done) {
          // Stream is complete, do the thing
          await fn(collector);
        }
        return {
          value: String(iterResult.value ?? ""),
          done: Boolean(iterResult.done),
        };
      } catch (e) {
        // If the stream errors, do the thing
        await fn(collector);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(errorMessage, { cause: e });
      }
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
  return wrappedStream as Streamable;
}
