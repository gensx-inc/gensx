// Helper to check if something is a streamable value
export function isStreamable(value) {
    return (value !== null && typeof value === "object" && Symbol.asyncIterator in value);
}
// Helper to assert that a value is a string (not a Streamable)
// This ensures proper type narrowing in TypeScript
export function assertString(value) {
    if (isStreamable(value)) {
        throw new Error("Expected string but got Streamable");
    }
}
// Helper to extract string content from a value that could be either string or Streamable
// This is useful for components that need to handle both return types
export function ensureString(value) {
    if (typeof value === "string") {
        return Promise.resolve(value);
    }
    // If it's a Streamable, consume it to get the full string
    return new Promise((resolve) => {
        let result = "";
        // Create an async function to handle the iteration
        (async () => {
            for await (const chunk of value) {
                result += chunk;
            }
            resolve(result);
        })().catch((error) => {
            console.error("Error converting Streamable to string:", error);
            throw error;
        });
    });
}
export async function streamToString(stream) {
    let result = "";
    for await (const chunk of stream) {
        result += chunk;
    }
    return result;
}
export function streamFromArray(array, delayMs = 0) {
    const asyncGenerator = async function* () {
        for (const item of array) {
            if (delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
            yield item;
        }
    };
    return asyncGenerator();
}
export function streamFromString(text, chunkSize = 1, delayMs = 0) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return streamFromArray(chunks, delayMs);
}
// Utility to combine multiple streamable sources
export function combineStreams(streams) {
    const asyncGenerator = async function* () {
        for (const stream of streams) {
            for await (const chunk of stream) {
                yield chunk;
            }
        }
    };
    return asyncGenerator();
}
// Map a stream through a transformation function
export function mapStream(stream, mapFn) {
    const asyncGenerator = async function* () {
        for await (const chunk of stream) {
            yield mapFn(chunk);
        }
    };
    return asyncGenerator();
}
