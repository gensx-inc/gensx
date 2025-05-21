import { createComponent } from "./component.js";

/**
 * Options for wrapping SDKs and functions.
 */
export interface WrapOptions {
  /** Optional prefix for all generated component names. */
  prefix?: string;
}

/**
 * Recursively walks an SDK instance and returns a proxy whose *functions*
 * are GenSX components and whose *objects* are wrapped proxies.
 */
export function wrap<T extends object>(sdk: T, opts: WrapOptions = {}): T {
  /**
   * Internal helper that builds a proxy for `target` and keeps track of the
   * path so we can generate sensible component names like:
   *   "OpenAI.chat.completions.create"
   */
  const makeProxy = <U extends object>(target: U, path: string[]): U =>
    new Proxy(target, {
      get(origTarget, propKey, receiver) {
        const value = Reflect.get(origTarget, propKey, receiver);

        // ----- Case 1: it's a function → return a GenSX component
        if (typeof value === "function") {
          const componentName =
            (opts.prefix ? `${opts.prefix}.` : "") +
            [...path, String(propKey)].join(".");

          // Bind the original `this` so SDK internals keep working
          const boundFn = value.bind(origTarget) as (input: object) => unknown;
          return wrapFunction(boundFn, componentName);
        }

        // ----- Case 2: it's an object that might contain more functions
        if (
          typeof value === "object" &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          return makeProxy(value as object, [...path, String(propKey)]);
        }

        // ----- Case 3: primitive or unhandled → pass through untouched
        return value;
      },
    });

  // Kick things off with the SDK's constructor name as the first path element
  const hasCustomConstructor =
    "constructor" in sdk && sdk.constructor !== Object;
  const rootName = hasCustomConstructor
    ? sdk.constructor.name.toLowerCase()
    : "sdk";
  return makeProxy(sdk, [rootName]);
}

/**
 * Wraps a single function into a Gensx component.
 * This allows you to use any function as a Gensx component, making it compatible
 * with the Gensx workflow system.
 *
 * @param fn The function to wrap
 * @param name Optional name for the component. If not provided, the function name will be used.
 * @returns A Gensx component that wraps the provided function
 *
 * @example
 * ```tsx
 * const MyFunction = (input: string) => {
 *   return `Hello ${input}!`;
 * };
 *
 * // Using function name
 * const MyComponent = wrapFunction(MyFunction);
 *
 * // Or with custom name
 * const MyComponent = wrapFunction(MyFunction, "CustomName");
 *
 * // Use it in a workflow
 * const result = await MyComponent({ input: "World" });
 * // result = "Hello World!"
 * ```
 */
export function wrapFunction<TInput extends object, TOutput>(
  fn: (input: TInput) => Promise<TOutput> | TOutput,
  name?: string,
) {
  const componentName = name ?? (fn.name || "AnonymousComponent");
  return createComponent(fn, componentName);
}
