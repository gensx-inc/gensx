import { GetAllOpenRouterModelPricing } from "./workflows.js";

async function main() {
  try {
    const pricing = await GetAllOpenRouterModelPricing({});
    console.log("OpenRouter Model Pricing:");
    console.log(JSON.stringify(pricing, null, 2));
  } catch (error) {
    console.error("Error fetching model pricing:", error);
    process.exit(1);
  }
}

void main();
