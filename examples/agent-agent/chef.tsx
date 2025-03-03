import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";

import { cookTool } from "./cook.js";
import { prepTool } from "./prep.js";
import { shoppingAgentTool } from "./shoppingAgent.js";

const chefAgent = gsx.Component<{ meal: string }, string>(
  "chefAgent",
  ({ meal }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <ChatCompletion
          model="gpt-4o"
          messages={[
            {
              role: "system",
              content: `You are a world class chef. The user will ask for a meal, and you are tasked with:
1. Deciding what recipe to make based on the user's request
2. Shopping for the ingredients
3. Preparing the ingredients
4. Prepping the meal
5. Cooking the meal

You must respond with the recipe you made, and the ingredients you used, and how it turned out.

You should not ask follow up questions of the user, you should make any substitutions or changes you need to make in order to successfully make the meal.
`,
            },
            { role: "user", content: meal },
          ]}
          tools={[shoppingAgentTool, prepTool, cookTool]}
        />
      </OpenAIProvider>
    );
  },
);

export const chefAgentWorkflow = gsx.Workflow("chefAgentWorkflow", chefAgent);
