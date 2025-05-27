import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";

// Test component interfaces
interface Config {
  apiKey?: string;
  template?: string;
  secret?: string;
  credentials?: {
    apiKey: string;
    metadata: {
      token: string;
      shortValue: string;
    };
  };
  message?: string;
}

suite("secrets", () => {
  test("components can take secret props", async () => {
    // Define a component that takes potentially secret props
    async function secretComponent({
      config,
    }: {
      config: Partial<Config>;
    }): Promise<Partial<Config>> {
      await setTimeout(0);
      return config;
    }

    // Create decorated component with secret props
    const SecretComponent = gensx.Component("SecretComponent", secretComponent, {
      secretProps: [
        "config.apiKey",
        "config.credentials.apiKey",
        "config.credentials.metadata.token",
      ],
    });

    // Execute with some secret values
    const secretValue = "secret-api-key-12345";
    const result = await SecretComponent({
      config: {
        apiKey: secretValue,
        message: "Not a secret",
      },
    });

    // The component should return the values as-is
    expect(result.apiKey).toBe(secretValue);
    expect(result.message).toBe("Not a secret");
  });

  test("components can have secret outputs", () => {
    // Define a component that produces secret outputs
    function sensitiveOutputComponent(): string {
      // Return raw values - masking would happen at checkpoint level
      return [
        "123", // shortString - too short to mask
        "1234567", // barelyShort - too short to mask
        "12345678", // barelyLong - should be masked
        "123456789012", // definitelyLong - should be masked
        "456", // nested.short - too short to mask
        "long-secret-value", // nested.long - should be masked
      ].join(", ");
    }

    // Create decorated component with secret outputs
    const SecretOutputComponent = gensx.Component("SecretOutputComponent", sensitiveOutputComponent, {
      secretOutputs: true, // Mark the entire output as containing secrets
    });

    // Execute the component
    const result = SecretOutputComponent({});

    // Component should still return the original values
    expect(result).toContain("12345678");
    expect(result).toContain("long-secret-value");
  });
});
