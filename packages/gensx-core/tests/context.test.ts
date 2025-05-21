import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";

suite("context", () => {
  test("can create and use context with default value", async () => {
    const TestContext = gensx.createContext("default");

    // Define consumer function
    async function consumer(): Promise<string> {
      await setTimeout(0);
      const value = gensx.useContext(TestContext);
      return value;
    }
    
    // Create decorated component
    const Consumer = gensx.Component({
      name: "Consumer"
    })(consumer);

    // Execute directly
    const result = await Consumer({});
    expect(result).toBe("default");
  });

  test("can provide and consume context value", async () => {
    const TestContext = gensx.createContext("default");

    // Define consumer function
    async function consumer(): Promise<string> {
      await setTimeout(0);
      const value = gensx.useContext(TestContext);
      return value;
    }
    
    // Create decorated component
    const Consumer = gensx.Component({
      name: "Consumer"
    })(consumer);
    
    // We need to use the Provider component
    // This will be different with the decorator approach
    // Potentially via a WithContext helper or directly using context APIs
    
    // For now, let's assume we're using context directly
    const context = gensx.getCurrentContext();
    const contextWithValue = context.withContext({
      [TestContext.symbol]: "provided"
    });
    
    const result = await gensx.withContext(contextWithValue, async () => {
      return await Consumer({});
    });

    expect(result).toBe("provided");
  });

  test("can use typed context", async () => {
    interface User {
      name: string;
      age: number;
    }

    const UserContext = gensx.createContext<User>({ name: "", age: 0 });

    // Define consumer that uses typed context
    async function userConsumer(): Promise<User> {
      await setTimeout(0);
      const user = gensx.useContext(UserContext);
      return user;
    }
    
    // Create decorated component
    const Consumer = gensx.Component({
      name: "Consumer"
    })(userConsumer);
    
    // Set context value directly
    const context = gensx.getCurrentContext();
    const contextWithUser = context.withContext({
      [UserContext.symbol]: { name: "John", age: 30 }
    });
    
    const result = await gensx.withContext(contextWithUser, async () => {
      return await Consumer({});
    });

    expect(result).toEqual({ name: "John", age: 30 });
  });
});