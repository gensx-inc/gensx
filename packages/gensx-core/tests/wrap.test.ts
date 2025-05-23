import { describe, expect, it, vi } from "vitest";

import { Wrap, wrap, wrapFunction } from "../src/wrap.js";

describe("wrapFunction", () => {
  it("wraps a simple function", async () => {
    const add = (input: { a: number; b: number }) => input.a + input.b;
    const wrappedAdd = wrapFunction(add, { name: "Add" });

    const result = await wrappedAdd({ a: 1, b: 2 });
    expect(result).toBe(3);
  });

  it("wraps a simple empty function", async () => {
    const add = () => 42;
    const wrappedAdd = wrapFunction(add, { name: "Add" });

    const result = await wrappedAdd();
    expect(result).toBe(42);
  });

  it("uses function name when no name provided", async () => {
    function multiply(input: { a: number; b: number }) {
      return input.a * input.b;
    }
    const wrappedMultiply = wrapFunction(multiply);

    const result = await wrappedMultiply({ a: 3, b: 4 });
    expect(result).toBe(12);
  });

  it("handles async functions", async () => {
    const asyncAdd = async (input: { a: number; b: number }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return input.a + input.b;
    };
    const wrappedAsyncAdd = wrapFunction(asyncAdd, { name: "AsyncAdd" });

    const result = await wrappedAsyncAdd({ a: 5, b: 6 });
    expect(result).toBe(11);
  });

  it("wraps functions with no parameters", async () => {
    const getValue = () => 42;
    const wrappedGetValue = wrapFunction(getValue, { name: "GetValue" });

    const result = await wrappedGetValue({});
    expect(result).toBe(42);
  });

  it("wraps async functions with no parameters", async () => {
    const getAsyncValue = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "async result";
    };
    const wrappedGetAsyncValue = wrapFunction(getAsyncValue, { name: "GetAsyncValue" });

    const result = await wrappedGetAsyncValue({});
    expect(result).toBe("async result");
  });
});

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

  it("handles methods with no parameters", async () => {
    class DataProvider {
      private data = "test data";

      getData() {
        return Promise.resolve(this.data);
      }

      getTimestamp() {
        return Promise.resolve(Date.now());
      }

      syncMethod() {
        return "sync result";
      }
    }

    const provider = new DataProvider();
    const wrappedProvider = wrap(provider);

    const data = await wrappedProvider.getData();
    expect(data).toBe("test data");

    const timestamp = await wrappedProvider.getTimestamp();
    expect(typeof timestamp).toBe("number");

    const syncResult = await wrappedProvider.syncMethod();
    expect(syncResult).toBe("sync result");
  });

  it("handles objects with no-parameter functions", async () => {
    const utils = {
      getRandom: () => Math.random(),
      getConstant: () => Promise.resolve(42),
      helpers: {
        getVersion: () => "1.0.0",
        getEnv: () => Promise.resolve("development"),
      },
    };

    const wrappedUtils = wrap(utils);

    const random = await wrappedUtils.getRandom();
    expect(typeof random).toBe("number");

    const constant = await wrappedUtils.getConstant();
    expect(constant).toBe(42);

    const version = await wrappedUtils.helpers.getVersion();
    expect(version).toBe("1.0.0");

    const env = await wrappedUtils.helpers.getEnv();
    expect(env).toBe("development");
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

  it("handles methods with no parameters in decorator", async () => {
    @Wrap()
    class Service {
      private value = "service data";

      getValue() {
        return Promise.resolve(this.value);
      }

      getRandomNumber() {
        return Math.random();
      }

      async getAsyncValue() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async service data";
      }
    }

    const service = new Service();

    const value = await service.getValue();
    expect(value).toBe("service data");

    // TODO: figure out how to make linting work properly here
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const randomNumber = await service.getRandomNumber();
    expect(typeof randomNumber).toBe("number");

    const asyncValue = await service.getAsyncValue();
    expect(asyncValue).toBe("async service data");
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
