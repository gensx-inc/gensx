import { testComponentRunner } from "@gensx/test";
import { it, suite } from "vitest";

import { Editorial } from "../../src/components/editorial.js";
suite(
  "editorial",
  () => {
    it("should be able to generate an editorial", async () => {
      const { output, progressEvents } = await testComponentRunner(Editorial, {
        title: "Test Title",
        prompt: "Test Prompt",
        draft: "Test Draft",
        targetWordCount: 100,
      });

      console.log(output);
      console.log(progressEvents);
    });
  },
  30000,
);
