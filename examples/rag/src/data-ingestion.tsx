import { OpenAIEmbedding } from "@gensx/openai";
import { SearchClient } from "@gensx/storage";

/**
 * Initializes a baseball search namespace with player information
 * @returns A promise that resolves to a message indicating the namespace status
 */
export async function initializeBaseballSearchNamespace(): Promise<string> {
  const namespaceName = "baseball2";
  // Create a new search client
  const searchClient = new SearchClient();

  if (await searchClient.namespaceExists(namespaceName)) {
    return "Search namespace already exists";
  }

  // Get the namespace (creates it if it doesn't exist)
  const namespace = await searchClient.getNamespace(namespaceName);

  const documents = [
    {
      id: "1",
      text: "Marcus Bennett is a 1B for the Portland Pioneers",
    },
    {
      id: "2",
      text: "Ethan Carter is a SS for the San Antonio Stallions",
    },
    {
      id: "3",
      text: "Lucas Rivera is a OF for the Charlotte Cougars",
    },
  ];

  const embeddings = await OpenAIEmbedding.run({
    model: "text-embedding-3-small",
    input: documents.map((doc) => doc.text),
  });

  await namespace.write({
    upsertRows: documents.map((doc, index) => ({
      id: doc.id,
      vector: embeddings.data[index].embedding,
      text: doc.text,
    })),
    distanceMetric: "cosine_distance",
  });

  return "Search namespace initialized";
}
