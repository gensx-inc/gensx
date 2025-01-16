import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";

const buzzwords: string[] = [
  "agile",
  "best-in-class",
  "bleeding-edge",
  "cutting-edge",
  "disruptive",
  "ecosystem",
  "game-changing",
  "holistic",
  "innovation",
  "leverage",
  "mission-critical",
  "next-generation",
  "paradigm",
  "revolutionary",
  "robust",
  "scalable",
  "seamless",
  "state-of-the-art",
  "synergy",
  "transformative",
];

function CountBuzzwords({ text }: gsx.Args<{ text: string }, number>) {
  return text.split(" ").filter((word) => buzzwords.includes(word)).length;
}

async function CleanBuzzwords({
  text: prompt,
  iterations = 0,
  maxIterations = 5,
}: gsx.Args<
  { text: string; iterations?: number; maxIterations?: number },
  string
>) {
  const numBuzzwords = await gsx.execute<number>(
    <CountBuzzwords text={prompt} />,
  );

  if (numBuzzwords > 0 && iterations < maxIterations) {
    const systemPrompt = `Remove all buzzwords words from users message, but keep the meaning of the message. Return the cleaned message and nothing else.`;
    const cleanedPrompt = await gsx.execute<string>(
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ]}
      />,
    );

    return (
      <CleanBuzzwords
        text={cleanedPrompt}
        iterations={iterations + 1}
        maxIterations={maxIterations}
      />
    );
  }

  return prompt;
}

async function main() {
  const withoutBuzzwords = await gsx.execute<string>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <CleanBuzzwords
        text="We are a cutting-edge technology company leveraging bleeding-edge AI solutions to deliver best-in-class products to our customers. Our agile development methodology ensures we stay ahead of the curve with paradigm-shifting innovations.

Our mission-critical systems utilize cloud-native architectures and next-generation frameworks to create synergistic solutions that drive digital transformation. By thinking outside the box, we empower stakeholders with scalable and future-proof applications that maximize ROI.

Through our holistic approach to disruptive innovation, we create game-changing solutions that move the needle and generate impactful results. Our best-of-breed technology stack combined with our customer-centric focus allows us to ideate and iterate rapidly in this fast-paced market."
      />
    </OpenAIProvider>,
  );

  console.log("result:\n", withoutBuzzwords);
}

main().catch(console.error);
