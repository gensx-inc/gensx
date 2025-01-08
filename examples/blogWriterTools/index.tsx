import { gsx } from "gensx";
import { BlogWriter } from "./blogWriter.js";

async function main() {
  console.log("\n🚀 Starting blog writer example...");
  const blogPost = await gsx.execute(
    <BlogWriter prompt="Write about the future of AI and its impact on software development" />,
  );

  console.log("\n📝 Generated blog post:");
  console.log(blogPost);
}

main().catch(console.error);
