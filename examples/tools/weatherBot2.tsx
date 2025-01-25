import { gsx } from "gensx";
import { z } from "zod";

// Define the interfaces
// interface WeatherParams {
//   location: string;
// }

const GetWeatherSchema = z.object({
  location: z.string().describe("The city and state or country"),
});

type GetWeatherProps = z.infer<typeof GetWeatherSchema>;

interface GetWeatherResponse {
  temperature: number;
  conditions: string;
}

// The params will be inferred from GetWeatherSchema
const getWeatherTool = gsx.Tool<GetWeatherProps, GetWeatherResponse>({
  name: "getWeather",
  description: "Get the current weather for a location",
  schema: GetWeatherSchema,
  function: async (params: GetWeatherProps) => {
    // params.location is now properly typed as string
    console.log("Getting weather for:", params);
    return {
      temperature: 72,
      conditions: "sunny",
    };
  },
});

{
  /* <ChatCompletion
        model="gpt-4-turbo-preview"
        temperature={0}
        tools={[getWeatherTool]}
        messages={[
          {
            role: "system",
            content:
              "You are a helpful weather assistant. Use the getWeather tool when asked about weather.",
          },
          { role: "user", content: query },
        ]}
      > */
}
