import { ReflectionWorkflow } from "./workflows.js";

async function main() {
  // Get text from command line arguments or use default text
  const userText = process.argv[2];
  const defaultText = `We are a cutting-edge technology company leveraging bleeding-edge AI solutions to deliver best-in-class products to our customers. Our agile development methodology ensures we stay ahead of the curve with paradigm-shifting innovations.

Our mission-critical systems utilize cloud-native architectures and next-generation frameworks to create synergistic solutions that drive digital transformation. By thinking outside the box, we empower stakeholders with scalable and future-proof applications that maximize ROI.

Through our holistic approach to disruptive innovation, we create game-changing solutions that move the needle and generate impactful results. Our best-of-breed technology stack combined with our customer-centric focus allows us to ideate and iterate rapidly in this fast-paced market.`;

  const text = userText || defaultText;
  console.log("📝 Input text:\n", text);
  console.log("=".repeat(50));

  const improvedText = await ReflectionWorkflow({ text });
  console.log("🎯 Final text:\n", improvedText);
}

main().catch(console.error);
