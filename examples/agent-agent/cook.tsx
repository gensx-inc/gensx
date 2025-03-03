import { GSXTool } from "@gensx/openai";
import { z } from "zod";

export const cookTool = new GSXTool({
  name: "cook",
  description: "A tool for cooking a meal.",
  schema: z.object({
    ingredients: z.array(z.string()),
    recipe: z.string(),
  }),
  run: ({ ingredients, recipe }) => {
    return Promise.resolve(`Prepared ${recipe} with ${ingredients.join(", ")}`);
  },
});
