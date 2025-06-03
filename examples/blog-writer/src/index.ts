import { WriteBlog } from "./workflows.js";

async function main() {
  console.log("🚀 Starting blog writing workflow...\n");

  const result = await WriteBlog({
    title: "High Performance LLM Web Apps with Vercel",
    prompt: `Write a blog post about building high performance LLM web apps with Vercel and Next.js.
    Focus on streaming across the client server boundary and using the vercel AI SDK.
    `,
  });

  console.log("✅ Blog post generated successfully!\n");
  console.log("📊 Metadata:");
  console.log(`- Research topics: ${result.metadata.researchTopics.length}`);
  console.log(`- Sections: ${result.metadata.sectionsCount}`);
  console.log(
    `- Web research: ${result.metadata.hasWebResearch ? "✅" : "❌"}`,
  );
  console.log(
    `- Catalog research: ${result.metadata.hasCatalogResearch ? "✅" : "❌"}`,
  );
  console.log(`- Word count: ${result.metadata.wordCount}`);
  console.log("\n" + "=".repeat(50));
  console.log("📝 FINAL BLOG POST:");
  console.log("=".repeat(50) + "\n");
  console.log(result.content);
}

main().catch(console.error);
