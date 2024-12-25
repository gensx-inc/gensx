/* eslint-disable @typescript-eslint/no-namespace */
export namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ElementType = (props: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  // interface IntrinsicElements {}
  export type Element = Promise<unknown>;
  export interface ElementChildrenAttribute {
    children: (output: unknown) => JSX.Element | JSX.Element[];
  }
}

export type MaybePromise<T> = T | Promise<T>;

export const Fragment = (props: {
  children: JSX.Element[] | JSX.Element;
}): JSX.Element[] => {
  const fragId = Math.random().toString(36).slice(2, 8);
  console.log(`[${fragId}] 🎭 Fragment handling children`);

  if (Array.isArray(props.children)) {
    console.log(`[${fragId}] 🎭 Fragment returning array of children`);
    return props.children;
  }

  console.log(`[${fragId}] 🎭 Fragment wrapping single child in array`);
  return [props.children];
};

export const jsx = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>,
): Promise<Awaited<TOutput> | Awaited<TOutput>[]> => {
  const jsxId = Math.random().toString(36).slice(2, 8);
  console.log(
    `[${jsxId}] 🎭 JSX creating element for component:`,
    component.name,
  );

  if (!children && props?.children) {
    children = props.children;
    console.log(`[${jsxId}] 🎭 Using children from props`);
  }

  // Helper function to deeply resolve any value
  const resolveDeep = async (value: unknown): Promise<unknown> => {
    console.log(`[${jsxId}] 🔍 Resolving value of type:`, typeof value);

    // Handle promises first
    if (value instanceof Promise) {
      console.log(`[${jsxId}] ⏳ Resolving promise`);
      const resolved = await value;
      return resolveDeep(resolved);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      console.log(`[${jsxId}] 📚 Resolving array of ${value.length} items`);
      const resolvedArray = await Promise.all(
        value.map(item => resolveDeep(item)),
      );
      return resolvedArray;
    }

    // Handle objects (but not null)
    if (value && typeof value === "object") {
      console.log(
        `[${jsxId}] 🔧 Resolving object with keys:`,
        Object.keys(value),
      );
      const entries = Object.entries(value);
      const resolvedEntries = await Promise.all(
        entries.map(async ([key, val]) => [key, await resolveDeep(val)]),
      );
      return Object.fromEntries(resolvedEntries);
    }

    // Base case: primitive value
    console.log(`[${jsxId}] 📝 Reached primitive value:`, value);
    return value;
  };

  // Return a promise that will be handled by execute()
  return (async (): Promise<Awaited<TOutput> | Awaited<TOutput>[]> => {
    try {
      console.log(`[${jsxId}] 🎭 START executing component with props:`, props);

      // Execute component and deeply resolve its result
      const rawResult = await component(props ?? ({} as TProps));
      console.log(`[${jsxId}] 🎭 Component returned raw result:`, rawResult);

      const result = (await resolveDeep(rawResult)) as Awaited<TOutput>;
      console.log(`[${jsxId}] 🎭 Component result fully resolved:`, result);

      // If there are no children, return the resolved result
      if (!children) {
        console.log(`[${jsxId}] 🎭 No children, returning resolved result`);
        return result;
      }

      // Handle array of children (Fragment edge case)
      if (Array.isArray(children)) {
        console.log(`[${jsxId}] 🎭 Resolving array of children`);
        const resolvedChildren = await Promise.all(
          children.map(child => resolveDeep(child)),
        );
        console.log(`[${jsxId}] 🎭 Children array fully resolved`);
        return resolvedChildren as Awaited<TOutput>[];
      }

      // Handle child function
      if (typeof children === "function") {
        console.log(
          `[${jsxId}] 🎭 Calling children function with resolved result`,
        );
        const childrenResult = await children(result);
        console.log(
          `[${jsxId}] 🎭 Children function returned:`,
          childrenResult,
        );

        // Deeply resolve the children's result
        const resolvedChildrenResult = await resolveDeep(childrenResult);
        console.log(
          `[${jsxId}] 🎭 Children result fully resolved:`,
          resolvedChildrenResult,
        );
        return resolvedChildrenResult as Awaited<TOutput>;
      }

      // Handle single child (Fragment edge case)
      console.log(`[${jsxId}] 🎭 Resolving single child`);
      const resolvedChild = await resolveDeep(children);
      console.log(`[${jsxId}] 🎭 Single child fully resolved`);
      return resolvedChild as Awaited<TOutput>;
    } catch (error) {
      console.log(`[${jsxId}] 🎭 Error in JSX execution:`, error);
      throw error;
    }
  })();
};

export const jsxs = <
  TOutput,
  TProps extends Record<string, unknown> & {
    children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>;
  },
>(
  component: (props: TProps) => MaybePromise<TOutput>,
  props: TProps | null,
  children?: (output: TOutput) => MaybePromise<JSX.Element | JSX.Element[]>,
): Promise<TOutput | TOutput[]> => {
  return jsx(component, props, children);
};
