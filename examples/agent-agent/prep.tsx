import { GSXTool } from "@gensx/openai";
import { z } from "zod";
export const prepTool = new GSXTool({
  name: "prep",
  description: "A tool for preparing a set of ingredients for cooking.",
  schema: z.object({
    ingredients: z.array(z.string()),
    recipe: z.string(),
  }),
  run: ({ ingredients, recipe }) => {
    return Promise.resolve(`Prepared ${recipe} with ${ingredients.join(", ")}`);
  },
});
