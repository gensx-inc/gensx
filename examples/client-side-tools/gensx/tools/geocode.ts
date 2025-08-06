import { z } from "zod";
import { tool } from "ai";
import { pRateLimit } from "p-ratelimit";
import { useBlob } from "@gensx/storage";
import crypto from "crypto";

// TODO: Global rate limit
// The geocode API is rate limited to 1 call per second.
const limit = pRateLimit({
  interval: 1000, // 1000 ms == 1 second
  rate: 1, // 1 API calls per interval
  concurrency: 1, // no more than 1 running at once
  maxDelay: 30000, // an API call delayed > 30 sec is rejected
});

const schema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "A general location query (e.g., 'Paris, France', 'Empire State Building', '123 Main St, New York')",
    ),
  street: z.string().optional().describe("housenumber and streetname"),
  city: z.string().optional().describe("city"),
  county: z.string().optional().describe("county"),
  state: z.string().optional().describe("state"),
  country: z.string().optional().describe("country"),
  postalcode: z.string().optional().describe("postal code"),
});

export const geocodeTool = tool({
  description:
    "Geocode a location from an address or location query to get latitude and longitude coordinates. You can use either a general query (like 'Paris, France') or specific address components.",
  inputSchema: schema,
  execute: async (params: z.infer<typeof schema>) => {
    const { query, street, city, county, state, country, postalcode } = params;

    // Check if any parameters are provided
    if (
      !query &&
      !street &&
      !city &&
      !county &&
      !state &&
      !country &&
      !postalcode
    ) {
      return "No parameters provided";
    }

    // Create a hash for caching - include query in the hash
    const hashParams = crypto
      .createHash("sha256")
      .update(query ?? "")
      .update(street ?? "")
      .update(city ?? "")
      .update(county ?? "")
      .update(state ?? "")
      .update(country ?? "")
      .update(postalcode ?? "")
      .digest("hex");

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const addressBlob = useBlob<z.infer<typeof schema>>(
      `geocode-cache/${hashParams}.json`,
    );

    const cachedAddress = await addressBlob.getJSON();
    if (cachedAddress) {
      return cachedAddress;
    }

    const data = await limit(async () => {
      try {
        const queryParams = new URLSearchParams();

        // If query is provided, use it as the main search parameter
        if (query) {
          queryParams.set("q", query);
        } else {
          // Otherwise, use the structured address components
          if (street) queryParams.set("street", street);
          if (city) queryParams.set("city", city);
          if (county) queryParams.set("county", county);
          if (state) queryParams.set("state", state);
          if (country) queryParams.set("country", country);
          if (postalcode) queryParams.set("postalcode", postalcode);
        }

        // use the nominatim API to geocode the query
        // rate limits: https://operations.osmfoundation.org/policies/nominatim/
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${queryParams.toString()}&format=json&limit=5`,
          {
            headers: {
              "User-Agent": "GenSX Map Demo",
            },
          },
        );
        if (!response.ok) {
          return `Error geocoding: ${response.statusText}`;
        }
        return await response.json();
      } catch (error) {
        return `Error geocoding: ${error instanceof Error ? error.message : String(error)}`;
      }
    });

    await addressBlob.putJSON(data);

    return JSON.stringify(data, null, 2);
  },
});
