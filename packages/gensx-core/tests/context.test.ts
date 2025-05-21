import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import {
  createContext,
  getCurrentContext,
  useContext,
  withContext,
} from "../src/context";
import * as gensx from "../src/index.js";

suite("context", () => {
  test("can create and use context with default value", async () => {
    const TestContext = createContext("default");

    // Define consumer function
    async function consumer(): Promise<string> {
      await setTimeout(0);
      const value = useContext(TestContext);
      return value;
    }

    // Create decorated component
    const Consumer = gensx.Component({
      name: "Consumer",
    })(consumer);

    // Execute directly
    const result = await Consumer({});
    expect(result).toBe("default");
  });

  test("can provide and consume context value", async () => {
    const TestContext = createContext("default");

    // Define consumer function
    async function consumer(): Promise<string> {
      await setTimeout(0);
      const value = useContext(TestContext);
      return value;
    }

    // Create decorated component
    const Consumer = gensx.Component({
      name: "Consumer",
    })(consumer);

    // We need to use the Provider component
    // This will be different with the decorator approach
    // Potentially via a WithContext helper or directly using context APIs

    // For now, let's assume we're using context directly
    const context = getCurrentContext();
    const contextWithValue = context.withContext({
      [TestContext.symbol]: "provided",
    });

    const result = await withContext(contextWithValue, async () => {
      return await Consumer({});
    });

    expect(result).toBe("provided");
  });

  test("can use typed context", async () => {
    interface User {
      name: string;
      age: number;
    }

    const UserContext = createContext<User>({ name: "", age: 0 });

    // Define consumer that uses typed context
    async function userConsumer(): Promise<User> {
      await setTimeout(0);
      const user = useContext(UserContext);
      return user;
    }

    // Create decorated component
    const Consumer = gensx.Component({
      name: "Consumer",
    })(userConsumer);

    // Set context value directly
    const context = getCurrentContext();
    const contextWithUser = context.withContext({
      [UserContext.symbol]: { name: "John", age: 30 },
    });

    const result = await withContext(contextWithUser, async () => {
      return await Consumer({});
    });

    expect(result).toEqual({ name: "John", age: 30 });
  });
});
