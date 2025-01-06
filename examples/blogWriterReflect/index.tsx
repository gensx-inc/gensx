import { gsx } from "gensx";

import { BlogWritingReflectWorkflow } from "./reflect.js";

async function main() {
  const prompt = "Write a blog post about performance optimization in MongoDB";
  const response = await gsx.execute<string>(
    <BlogWritingReflectWorkflow prompt={prompt} />,
  );
  console.log(response);
}

main().catch(console.error);
