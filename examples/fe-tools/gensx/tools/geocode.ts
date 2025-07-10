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
  amenity: z.string().optional().describe("name and/or type of POI"),
  street: z.string().optional().describe("housenumber and streetname"),
  city: z.string().optional().describe("city"),
  county: z.string().optional().describe("county"),
  state: z.string().optional().describe("state"),
  country: z.string().optional().describe("country"),
  postalcode: z.string().optional().describe("postal code"),
});

export const geocodeTool = tool({
  description:
    "Geocode a location from an address to a specific latitude and longitude. Try to provide as much information as possible, but if you don't have all the information, you can still geocode the location.",
  parameters: schema,
  execute: async (params: z.infer<typeof schema>) => {
    const hashParams = crypto
      .createHash("sha256")
      .update(params.amenity ?? "")
      .update(params.street ?? "")
      .update(params.city ?? "")
      .update(params.county ?? "")
      .update(params.state ?? "")
      .update(params.country ?? "")
      .update(params.postalcode ?? "")
      .digest("hex");

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const addressBlob = useBlob<z.infer<typeof schema>>(
      `geocode-cache/${hashParams}.json`,
    );

    const cachedAddress = await addressBlob.getJSON();
    if (cachedAddress) {
      return cachedAddress;
    }

    return await limit(async () => {
      try {
        const { amenity, street, city, county, state, country, postalcode } =
          params;

        if (
          !amenity &&
          !street &&
          !city &&
          !county &&
          !state &&
          !country &&
          !postalcode
        ) {
          return "No parameters provided";
        }

        const queryParams = new URLSearchParams();
        if (amenity) queryParams.set("amenity", amenity);
        if (street) queryParams.set("street", street);
        if (city) queryParams.set("city", city);
        if (county) queryParams.set("county", county);
        if (state) queryParams.set("state", state);
        if (country) queryParams.set("country", country);
        if (postalcode) queryParams.set("postalcode", postalcode);

        // use the nominatim API to geocode the query
        // rate limits: https://operations.osmfoundation.org/policies/nominatim/
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${queryParams.toString()}&format=json`,
          {
            headers: {
              "User-Agent": "GenSX Map Demo",
            },
          },
        );
        if (!response.ok) {
          return `Error geocoding: ${response.statusText}`;
        }
        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        return `Error geocoding: ${error instanceof Error ? error.message : String(error)}`;
      }
    });
  },
});
