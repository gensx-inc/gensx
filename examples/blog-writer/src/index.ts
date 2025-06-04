import { WriteBlog } from "./workflows.js";

async function main() {
  console.log("🚀 Starting blog writing workflow...\n");

  const result = await WriteBlog({
    title: "Building High Performance LLM Web Apps with Vercel",
    prompt: `Write a blog post about building high performance LLM web apps with Vercel and Next.js.
    Focus on streaming across the client server boundary and using the vercel AI SDK.
    The audience for this post is software developers, so make sure to break up sections with code examples where appropriate and avoid large blocks of text.
    `,
    // optionally, add a link to a raw github markdown gist that can be downloaded and used as a reference
    // referenceUrl: "https://gist.githubusercontent.com/..."
    wordCount: 1500,
  });

  console.log("✅ Blog post generated successfully!\n");
  console.log("📊 Metadata:");
  console.log(`- Research topics: ${result.metadata.researchTopics.length}`);
  console.log(`- Sections: ${result.metadata.sectionsCount}`);
  console.log(
    `- Web research: ${result.metadata.hasWebResearch ? "✅" : "❌"}`,
  );
  console.log(
    `- Tone matching: ${result.metadata.hasToneMatching ? "✅" : "❌"}`,
  );
  console.log(`- Word count: ${result.metadata.wordCount}`);
  console.log("\n" + "=".repeat(50));
  console.log("📝 FINAL BLOG POST:");
  console.log("=".repeat(50) + "\n");
  console.log(result.content);
}

main().catch(console.error);
