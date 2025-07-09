import { isProxy } from "util/types";

import type { ComponentOpts } from "./types.js";

import { Component } from "./component.js";

/**
 * Options for wrapping SDKs and functions.
 */
export interface WrapOptions {
  /** Optional prefix for all generated component names. */
  prefix?: string;
  /** Optional function to generate component options based on the path and arguments. */
  getComponentOpts?: (path: string[], args: unknown) => Partial<ComponentOpts>;
  replacementImplementations?: Record<
    string,
    (origTarget: object, prop: object) => object
  >;
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
  const makeProxy = <U extends object>(target: U, path: string[]): U => {
    if (isProxy(target)) {
      return target;
    }

    const proxy = new Proxy(target, {
      get(origTarget, propKey, receiver) {
        const value = Reflect.get(origTarget, propKey, receiver);

        const newPath = [...path, String(propKey)].join(".");
        const replacementImplementation =
          opts.replacementImplementations?.[newPath];

        if (replacementImplementation) {
          return replacementImplementation(origTarget, value as object);
        }

        // ----- Case 1: it's a function → return a GenSX component
        if (typeof value === "function") {
          const componentName =
            (opts.prefix ? `${opts.prefix}.` : "") +
            [...path, String(propKey)].join(".");

          // Bind the original `this` so SDK internals keep working
          const boundFn = value.bind(origTarget) as (input?: object) => unknown;
          const componentOpts = opts.getComponentOpts?.(path, boundFn);
          return Component(componentName, boundFn, {
            ...componentOpts,
          });
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

    return proxy;
  };

  // Kick things off with the SDK's constructor name as the first path element
  const hasCustomConstructor =
    "constructor" in sdk && sdk.constructor !== Object;
  const rootName = hasCustomConstructor ? sdk.constructor.name : "sdk";

  return makeProxy(sdk, [rootName]);
}

/**
 * A class decorator that wraps all methods of a class into GenSX components.
 * This allows you to use any class as a collection of GenSX components.
 *
 * Compatible with both legacy experimental decorators and the new ECMAScript decorator proposal.
 *
 * @param options Optional configuration for the wrapper
 * @returns A class decorator function
 *
 * @example
 * ```tsx
 * // Legacy syntax (experimentalDecorators)
 * @Wrap()
 * class Calculator {
 *   add(input: { a: number; b: number }) {
 *     return input.a + input.b;
 *   }
 * }
 *
 * // New syntax (ECMAScript decorators)
 * @Wrap()
 * class Calculator {
 *   add(input: { a: number; b: number }) {
 *     return input.a + input.b;
 *   }
 * }
 * ```
 */
export function Wrap(options: WrapOptions = {}) {
  // Legacy decorator implementation
  function legacyDecorator<T extends new (...args: unknown[]) => object>(
    constructor: T,
  ) {
    // Create a new constructor function
    const WrappedClass = function (this: object, ...args: unknown[]) {
      // Call the original constructor
      constructor.apply(this, args);
      // Wrap the instance
      return wrap(this, options);
    };

    // Copy prototype so instanceof operator still works
    WrappedClass.prototype = constructor.prototype;
    // Copy static properties
    Object.assign(WrappedClass, constructor);

    return WrappedClass as unknown as T;
  }

  // New decorator implementation
  function newDecorator<T extends new (...args: unknown[]) => object>(
    target: T,
    context: ClassDecoratorContext,
  ) {
    // Add an initializer that wraps the instance
    context.addInitializer(function (this: object) {
      return wrap(this, options);
    });

    return target;
  }

  // Return the appropriate decorator based on the context
  return function decorator<T extends new (...args: unknown[]) => object>(
    target: T,
    context?: ClassDecoratorContext,
  ) {
    // If context is provided, we're using the new decorator syntax
    if (context) {
      return newDecorator(target, context);
    }
    // Otherwise, we're using the legacy decorator syntax
    return legacyDecorator(target);
  };
}
