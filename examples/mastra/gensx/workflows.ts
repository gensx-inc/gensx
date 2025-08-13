import { mastra } from "../src/mastra";
import { wrapMastra } from "./wrapper";

const wrappedMastra = wrapMastra(mastra);

export const weatherWorkflow = wrappedMastra.weatherWorkflow;
export const weatherAgent = wrappedMastra.weatherAgent;
