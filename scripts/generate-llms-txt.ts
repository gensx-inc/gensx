import { readFileSync, writeFileSync } from "fs";
import { resolve, relative, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import matter from "gray-matter";

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCS_DIR = resolve(__dirname, "../website/docs/src/content");
const BLOGS_DIR = resolve(__dirname, "../website/home/_posts");
const OUTPUT_FILE = resolve(__dirname, "../website/home/public/llms.txt");
const BASE_URL = "https://gensx.com/"; // Adjust this to your actual base URL

interface DocMetadata {
  title: string;
  description: string;
  path: string;
  url: string;
}

// Find all MDX files in the docs directory
const findDocsFiles = async (): Promise<string[]> => {
  return await glob(`${DOCS_DIR}/**/*.mdx`);
};

// Find all MD files in the blogs directory that don't start with an underscore
const findBlogFiles = async (): Promise<string[]> => {
  const allFiles = await glob(`${BLOGS_DIR}/*.md`);
  return allFiles.filter((file) => !basename(file).startsWith("_"));
};

// Extract frontmatter from MDX/MD files
const extractMetadata = (filePath: string, isDoc: boolean): DocMetadata => {
  const fileContent = readFileSync(filePath, "utf8");
  const { data } = matter(fileContent);

  if (isDoc) {
    const relativePath = relative(DOCS_DIR, filePath).replace(/\.mdx$/, "");
    return {
      title: data.title || basename(filePath, ".mdx"),
      description: data.description || "",
      path: `docs/${relativePath}`,
      url: `${BASE_URL}docs/${relativePath}`,
    };
  } else {
    // For blog posts
    const fileName = basename(filePath, ".md");
    return {
      title: data.title || fileName,
      description: data.description || "",
      path: `blogs/${fileName}`,
      url: `${BASE_URL}blogs/${fileName}`,
    };
  }
};

// Generate the content for llms.txt
const generateList = (metadata: DocMetadata[]): string => {
  return metadata
    .map((item) => {
      return `- [${item.title}](${item.url})`;
    })
    .join("\n");
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
    const blogFiles = await findBlogFiles();

    const docsMetadata = docsFiles.map((file) => extractMetadata(file, true));
    const blogMetadata = blogFiles.map((file) => extractMetadata(file, false));

    const docsLinks = generateList(docsMetadata);
    const blogLinks = generateList(blogMetadata);

    const prelude = `# GenSX\n\nGenSX is a simple typescript framework for building complex LLM applications. It’s built around functional, reusable components that are composed using JSX to create and orchestrate workflows.`;

    const content = `${prelude}\n\n## Docs\n\n${docsLinks}\n\n## Blog\n\n${blogLinks}`;

    writeOutput(content);
  } catch (error) {
    console.error("Error generating llms.txt:", error);
    process.exit(1);
  }
};

main();
