import { NextResponse } from "next/server";

// Define which environment variables are required for each provider
const PROVIDER_ENV_REQUIREMENTS: Record<string, string[]> = {
  openai: ["OPENAI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY"],
  mistral: ["MISTRAL_API_KEY"],
  cohere: ["COHERE_API_KEY"],
  "amazon-bedrock": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  azure: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
  deepseek: ["DEEPSEEK_API_KEY"],
  groq: ["GROQ_API_KEY"],
  xai: ["XAI_API_KEY"],
};

// Check if a provider has all required environment variables
function isProviderAvailable(provider: string): boolean {
  const requiredEnvVars = PROVIDER_ENV_REQUIREMENTS[provider] ?? [];
  return requiredEnvVars.every((envVar) => !!process.env[envVar]);
}

export async function GET() {
  try {
    const response = await fetch("https://models.dev/api.json", {
      // Add cache control to avoid hitting the API too frequently
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();

    // Build provider availability status
    const providerStatus = Object.keys(PROVIDER_ENV_REQUIREMENTS).reduce<
      Record<string, boolean>
    >((acc, provider) => {
      acc[provider] = isProviderAvailable(provider);
      return acc;
    }, {});

    // Return all data with availability information
    return NextResponse.json({
      providers: data,
      providerStatus,
    });
  } catch (error) {
    console.error("Error fetching models from models.dev:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }
}
