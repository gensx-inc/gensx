import { z } from "zod";
import { tool } from "ai";

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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${queryParams.toString()}&format=json`,
      );
      if (!response.ok) {
        return `Error geocoding: ${response.statusText}`;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return `Error geocoding: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
