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
  latitude: z.number().describe("Latitude coordinate to reverse geocode"),
  longitude: z.number().describe("Longitude coordinate to reverse geocode"),
});

export const reverseGeocodeTool = tool({
  description:
    "Reverse geocode a location from a specific latitude and longitude to an map object. This can be used to get the address or city, country, etc from a set of coordinates.",
  parameters: schema,
  execute: async (params: z.infer<typeof schema>) => {
    const { latitude, longitude } = params;

    if (!latitude || !longitude) {
      return "No parameters provided";
    }

    const hashParams = crypto
      .createHash("sha256")
      .update(latitude.toString())
      .update(longitude.toString())
      .digest("hex");

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const reverseGeocodeBlob = useBlob<z.infer<typeof schema>>(
      `reverse-geocode-cache/${hashParams}.json`,
    );

    const cachedAddress = await reverseGeocodeBlob.getJSON();
    if (cachedAddress) {
      return cachedAddress;
    }

    const data = await limit(async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("lat", latitude.toString());
        queryParams.set("lon", longitude.toString());

        // use the nominatim API to geocode the query
        // rate limits: https://operations.osmfoundation.org/policies/nominatim/
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?${queryParams.toString()}&format=json`,
          {
            headers: {
              "User-Agent": "GenSX Map Demo",
            },
          },
        );
        if (!response.ok) {
          return `Error reverse geocoding: ${response.statusText}`;
        }
        return await response.json();
      } catch (error) {
        return `Error reverse geocoding: ${error instanceof Error ? error.message : String(error)}`;
      }
    });

    await reverseGeocodeBlob.putJSON(data);

    return JSON.stringify(data, null, 2);
  },
});
