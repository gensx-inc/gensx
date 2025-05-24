import { describe, expect, it, vi } from "vitest";

import { Wrap, wrap } from "../src/wrap.js";

describe("wrap", () => {
  it("wraps a class instance", async () => {
    class Calculator {
      async add(input: { a: number; b: number }) {
        return Promise.resolve(input.a + input.b);
      }
      async subtract(input: { a: number; b: number }) {
        return Promise.resolve(input.a - input.b);
      }
    }

    const calc = new Calculator();
    const wrappedCalc = wrap(calc);

    const addResult = await wrappedCalc.add({ a: 10, b: 5 });
    expect(addResult).toBe(15);

    const subtractResult = await wrappedCalc.subtract({ a: 10, b: 5 });
    expect(subtractResult).toBe(5);
  });

  it("wraps nested objects", async () => {
    const api = {
      users: {
        get: (input: { id: string }) => Promise.resolve(`User ${input.id}`),
        create: (input: { name: string }) =>
          Promise.resolve(`Created ${input.name}`),
      },
      posts: {
        list: (input: { limit: number }) =>
          Promise.resolve(`Listed ${input.limit} posts`),
      },
    };

    const wrappedApi = wrap(api);

    const user = await wrappedApi.users.get({ id: "123" });
    expect(user).toBe("User 123");

    const newUser = await wrappedApi.users.create({ name: "John" });
    expect(newUser).toBe("Created John");

    const posts = await wrappedApi.posts.list({ limit: 10 });
    expect(posts).toBe("Listed 10 posts");
  });

  it("handles custom prefixes", async () => {
    const api = {
      getData: (input: { id: string }) => Promise.resolve(`Data ${input.id}`),
    };

    const wrappedApi = wrap(api, { prefix: "MyAPI" });

    const result = await wrappedApi.getData({ id: "123" });
    expect(result).toBe("Data 123");
  });

  it("preserves arrays and dates", () => {
    const obj = {
      array: [1, 2, 3],
      date: new Date("2024-01-01"),
    };

    const wrapped = wrap(obj);
    expect(wrapped.array).toEqual([1, 2, 3]);
    expect(wrapped.date).toBeInstanceOf(Date);
  });

  it("maintains this context in class methods", async () => {
    class Counter {
      private count = 0;

      increment(_input: {}) {
        this.count++;
        return Promise.resolve(this.count);
      }

      getCount(_input: {}) {
        return Promise.resolve(this.count);
      }
    }

    const counter = new Counter();
    const wrappedCounter = wrap(counter);

    const count1 = await wrappedCounter.increment({});
    expect(count1).toBe(1);

    const count2 = await wrappedCounter.increment({});
    expect(count2).toBe(2);

    const finalCount = await wrappedCounter.getCount({});
    expect(finalCount).toBe(2);
  });
});

describe("Wrap decorator", () => {
  it("wraps class methods into components", async () => {
    @Wrap()
    class Calculator {
      add(input: { a: number; b: number }) {
        return Promise.resolve(input.a + input.b);
      }
      subtract(input: { a: number; b: number }) {
        return Promise.resolve(input.a - input.b);
      }
    }

    const calc = new Calculator();
    const addResult = await calc.add({ a: 10, b: 5 });
    expect(addResult).toBe(15);

    const subtractResult = await calc.subtract({ a: 10, b: 5 });
    expect(subtractResult).toBe(5);
  });

  it("handles custom prefixes", async () => {
    @Wrap({ prefix: "MyAPI" })
    class API {
      getData(input: { id: string }) {
        return Promise.resolve(`Data ${input.id}`);
      }
    }

    const api = new API();
    const result = await api.getData({ id: "123" });
    expect(result).toBe("Data 123");
  });

  it("maintains this context in class methods", async () => {
    @Wrap()
    class Counter {
      private count = 0;

      increment(_input: {}) {
        this.count++;
        return Promise.resolve(this.count);
      }

      getCount(_input: {}) {
        return Promise.resolve(this.count);
      }
    }

    const counter = new Counter();
    const count1 = await counter.increment({});
    expect(count1).toBe(1);

    const count2 = await counter.increment({});
    expect(count2).toBe(2);

    const finalCount = await counter.getCount({});
    expect(finalCount).toBe(2);
  });

  it("preserves class inheritance", async () => {
    class Base {
      baseMethod(input: { value: string }) {
        return Promise.resolve(`Base: ${input.value}`);
      }
    }

    @Wrap()
    class Derived extends Base {
      derivedMethod(input: { value: string }) {
        return Promise.resolve(`Derived: ${input.value}`);
      }
    }

    const derived = new Derived();
    const baseResult = await derived.baseMethod({ value: "test" });
    expect(baseResult).toBe("Base: test");

    const derivedResult = await derived.derivedMethod({ value: "test" });
    expect(derivedResult).toBe("Derived: test");
  });
});

describe("getComponentOpts", () => {
  it("calls getComponentOpts with correct path and arguments", async () => {
    const getComponentOpts = vi.fn((path: string[], _args: unknown) => ({
      metadata: { path },
    }));

    const api = {
      users: {
        get: (input: { id: string }) => Promise.resolve(`User ${input.id}`),
      },
    };

    const wrappedApi = wrap(api, { getComponentOpts });
    await wrappedApi.users.get({ id: "123" });

    expect(getComponentOpts).toHaveBeenCalledWith(
      ["sdk", "users"],
      expect.any(Function),
    );
  });

  it("applies component options from getComponentOpts", async () => {
    const getComponentOpts = vi.fn((_path: string[], _args: unknown) => ({
      metadata: { custom: "value" },
    }));

    const api = {
      getData: (input: { id: string }) => Promise.resolve(`Data ${input.id}`),
    };

    const wrappedApi = wrap(api, { getComponentOpts });
    const result = await wrappedApi.getData({ id: "123" });
    expect(result).toBe("Data 123");
  });

  it("uses prefix in component name but not in path", async () => {
    const getComponentOpts = vi.fn((path: string[], _args: unknown) => ({
      metadata: { path },
    }));

    const api = {
      getData: (input: { id: string }) => Promise.resolve(`Data ${input.id}`),
    };

    const wrappedApi = wrap(api, { prefix: "MyAPI", getComponentOpts });
    await wrappedApi.getData({ id: "123" });

    expect(getComponentOpts).toHaveBeenCalledWith(
      ["sdk"],
      expect.any(Function),
    );
  });

  it("works with class instances", async () => {
    const getComponentOpts = vi.fn((path: string[], _args: unknown) => ({
      metadata: { path },
    }));

    class Calculator {
      add(input: { a: number; b: number }) {
        return Promise.resolve(input.a + input.b);
      }
    }

    const calc = new Calculator();
    const wrappedCalc = wrap(calc, { getComponentOpts });
    await wrappedCalc.add({ a: 1, b: 2 });

    expect(getComponentOpts).toHaveBeenCalledWith(
      ["Calculator"],
      expect.any(Function),
    );
  });
});
