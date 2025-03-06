import { readFileSync, writeFileSync } from "fs";
import { resolve, relative, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import matter from "gray-matter";

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCS_DIR = resolve(__dirname, "../website/docs/src/content");
const OUTPUT_FILE = resolve(__dirname, "../website/home/public/llms-full.txt");
const BASE_URL = "https://gensx.com/"; // Adjust this to your actual base URL

interface DocContent {
  title: string;
  content: string;
  path: string;
  order: number;
}

// Find all MDX files in the docs directory
const findDocsFiles = async (): Promise<string[]> => {
  return await glob(`${DOCS_DIR}/**/*.mdx`);
};

// Extract frontmatter and content from MDX files
const extractContent = (filePath: string): DocContent => {
  const fileContent = readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);
  const relativePath = relative(DOCS_DIR, filePath).replace(/\.mdx$/, "");

  // Try to determine an order from the filename or frontmatter
  let order = 999;
  const fileNameMatch = basename(filePath, ".mdx").match(/^(\d+)-/);
  if (fileNameMatch) {
    order = parseInt(fileNameMatch[1], 10);
  } else if (data.order !== undefined) {
    order = data.order;
  }

  return {
    title: data.title || basename(filePath, ".mdx"),
    content: content,
    path: `docs/${relativePath}`,
    order: order,
  };
};

// Write the content to the output file
const writeOutput = (content: string): void => {
  writeFileSync(OUTPUT_FILE, content);
  console.log(`Generated ${OUTPUT_FILE}`);
};

// Main function
const main = async (): Promise<void> => {
  try {
    const docsFiles = await findDocsFiles();
    const docsContents = docsFiles.map((file) => extractContent(file));

    // Sort docs by order
    docsContents.sort((a, b) => a.order - b.order);

    // Combine all documentation content
    let fullContent = "";

    for (const doc of docsContents) {
      fullContent += doc.content;
    }

    writeOutput(fullContent);
  } catch (error) {
    console.error("Error generating llms-full.txt:", error);
    process.exit(1);
  }
};

main();
