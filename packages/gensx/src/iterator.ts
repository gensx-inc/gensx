/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Checks if the given object is an Iterable (implemented `@@iterator`).
 * @returns {obj is Iterable<any>}
 */
export function isIterable<T>(obj: any): obj is Iterable<T> {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj[Symbol.iterator] === "function"
  );
}

/**
 * Checks if the given object is an AsyncIterable (implemented `@@asyncIterator`).
 * @returns {obj is AsyncIterable<any>}
 */
export function isAsyncIterable<T>(obj: any): obj is AsyncIterable<T> {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj[Symbol.asyncIterator] === "function"
  );
}

/**
 * Checks if the given object is an IteratorLike (implemented `next`).
 * @returns {obj is { next: Function }}
 */
export function isIteratorLike(obj: any): obj is { next: Function } {
  // An iterable object has a 'next' method, however including a 'next' method
  // doesn't ensure the object is an iterator, it is only iterator-like.
  return (
    typeof obj === "object" && obj !== null && typeof obj.next === "function"
  );
}

/**
 * Checks if the given object is an IterableIterator (implemented both
 * `@@iterator` and `next`).
 */
export function isIterableIterator<T>(obj: any): obj is IterableIterator<T> {
  return (
    isIteratorLike(obj) && typeof (obj as any)[Symbol.iterator] === "function"
  );
}

/**
 * Checks if the given object is an AsyncIterableIterator (implemented
 * both `@@asyncIterator` and `next`).
 * @returns {obj is AsyncIterableIterator<any>}
 */
export function isAsyncIterableIterator(
  obj: any,
): obj is AsyncIterableIterator<any> {
  return (
    isIteratorLike(obj) &&
    typeof (obj as any)[Symbol.asyncIterator] === "function"
  );
}
