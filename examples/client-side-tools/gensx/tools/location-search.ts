import { z } from "zod";
import { tool } from "ai";
import { pRateLimit } from "p-ratelimit";
import { useBlob } from "@gensx/storage";
import crypto from "crypto";

// Rate limiting for Mapbox API calls
const limit = pRateLimit({
  interval: 1000, // 1000 ms == 1 second
  rate: 10, // 10 API calls per interval
  concurrency: 10, // allow 10 concurrent requests
  maxDelay: 30000, // an API call delayed > 30 sec is rejected
});

const schema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Search query for places, businesses, or points of interest. This parameter is REQUIRED and cannot be empty.",
    ),
  category: z
    .string()
    .optional()
    .describe(
      "Category filter (e.g., 'restaurant', 'hotel', 'gas_station', 'parking')",
    ),
  bbox: z
    .string()
    .optional()
    .describe(
      "Bounding box as 'minLon,minLat,maxLon,maxLat' to search within a specific area.",
    ),
  proximity: z
    .string()
    .optional()
    .describe("Center point for proximity search as 'longitude,latitude'"),
  radius: z
    .number()
    .optional()
    .describe("Radius in meters for proximity search (default: 5000)"),
  waypoints: z
    .string()
    .optional()
    .describe(
      "Waypoints as 'lon1,lat1;lon2,lat2;lon3,lat3' to search along a route between these points",
    ),
  limit: z
    .number()
    .optional()
    .describe(
      "Maximum number of results to return (default: 10, max: 10, min: 1)",
    ),
  language: z
    .string()
    .optional()
    .describe("Language for results (default: 'en')"),
  country: z
    .string()
    .optional()
    .describe("Country code to limit search to specific country"),
  types: z
    .string()
    .optional()
    .describe(
      "Comma-separated list of place types (poi, address, country, region, postcode, locality, neighborhood)",
    ),
});

interface MapboxSearchResult {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: {
      name: string;
      name_preferred?: string;
      mapbox_id: string;
      feature_type: string;
      address?: string;
      full_address?: string;
      place_formatted?: string;
      context: {
        country?: {
          id: string;
          name: string;
          country_code: string;
          country_code_alpha_3: string;
        };
        region?: {
          id: string;
          name: string;
          region_code: string;
          region_code_full: string;
        };
        postcode?: {
          id: string;
          name: string;
        };
        district?: {
          id: string;
          name: string;
        };
        place?: {
          id: string;
          name: string;
        };
        locality?: {
          id: string;
          name: string;
        };
        neighborhood?: {
          id: string;
          name: string;
        };
        address?: {
          id: string;
          name: string;
          address_number: string;
          street_name: string;
        };
        street?: {
          id: string;
          name: string;
        };
      };
      coordinates: {
        longitude: number;
        latitude: number;
        accuracy?: string;
        routable_points?: Array<{
          name: string;
          latitude: number;
          longitude: number;
          note?: string;
        }>;
      };
      bbox?: number[];
      language?: string;
      maki?: string;
      poi_category?: string[];
      poi_category_ids?: string[];
      brand?: string[];
      brand_id?: string[];
      external_ids?: Record<string, string>;
      metadata?: Record<string, unknown>;
    };
  }>;
  attribution: string;
  query: string[];
}

export const locationSearchTool = tool({
  description: `Advanced location search using Mapbox APIs. This tool can search for places, businesses, and points of interest with advanced filtering options:

IMPORTANT: The 'query' parameter is REQUIRED - you must always provide a search term.

- Search within specific areas using bounding boxes
- Search along routes between waypoints for navigation-related queries
- Filter by categories (restaurants, hotels, gas stations, etc.)
- Proximity-based search around specific coordinates
- Multi-language support
- Country-specific searches

Use this tool when you need to find specific types of places, businesses, or amenities in a particular area or along a route between waypoints.`,
  parameters: schema,
  execute: async (params: z.infer<typeof schema>) => {
    const {
      query,
      category,
      bbox,
      proximity,
      radius = 5000,
      waypoints,
      limit: resultLimit = 10,
      language = "en",
      country,
      types,
    } = params;

    if (!query || query.trim().length === 0) {
      return "Error: Search query is required and cannot be empty. Please provide a search term for places, businesses, or points of interest.";
    }

    // Create a hash for caching
    const hashParams = crypto
      .createHash("sha256")
      .update(query)
      .update(category ?? "")
      .update(bbox ?? "")
      .update(proximity ?? "")
      .update(radius.toString())
      .update(waypoints ?? "")
      .update(limit.toString())
      .update(language)
      .update(country ?? "")
      .update(types ?? "")
      .digest("hex");

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const searchBlob = useBlob<MapboxSearchResult>(
      `location-search-cache/${hashParams}.json`,
    );

    const cachedResult = await searchBlob.getJSON();
    if (cachedResult) {
      return formatSearchResults(cachedResult);
    }

    const data = await limit(async () => {
      try {
        const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
        if (!mapboxToken) {
          console.error("MAPBOX_ACCESS_TOKEN environment variable not set");
          return "Error: MAPBOX_ACCESS_TOKEN environment variable not set";
        }

        const queryParams = new URLSearchParams({
          access_token: mapboxToken,
          q: query,
          limit: Math.min(resultLimit, 10).toString(),
          language,
          // session_token: `${userId}-${threadId}`,
        });

        // If proximity and radius are provided, create a bounding box around the proximity point
        if (!bbox && proximity && radius) {
          const [proximityLon, proximityLat] = proximity.split(",").map(Number);

          // Convert radius from meters to degrees (approximate)
          // 1 degree of latitude ≈ 111,000 meters
          // 1 degree of longitude ≈ 111,000 * cos(latitude) meters
          const latDelta = radius / 111000; // degrees
          const lonDelta =
            radius / (111000 * Math.cos((proximityLat * Math.PI) / 180)); // degrees

          // Create bounding box: minLon,minLat,maxLon,maxLat
          const minLon = proximityLon - lonDelta;
          const minLat = proximityLat - latDelta;
          const maxLon = proximityLon + lonDelta;
          const maxLat = proximityLat + latDelta;

          const calculatedBbox = `${minLon},${minLat},${maxLon},${maxLat}`;
          queryParams.set("bbox", calculatedBbox);
        } else if (bbox) {
          queryParams.set("bbox", bbox);
        }

        // Add optional parameters
        if (category) {
          queryParams.set("poi_category", category);
        }
        if (proximity) {
          queryParams.set("proximity", proximity);
        }
        if (country) {
          queryParams.set("country", country);
        }
        if (types) {
          queryParams.set("types", types);
        }

        const endpoint = "https://api.mapbox.com/search/searchbox/v1/forward";

        // If waypoints are provided, use the directions API to get route geometry first
        if (waypoints) {
          const waypointCoords = waypoints.split(";").map((coord) => {
            const [lon, lat] = coord.split(",").map(Number);
            return [lon, lat];
          });

          if (waypointCoords.length >= 2) {
            // Get route geometry from Mapbox Directions API
            const directionsParams = new URLSearchParams({
              access_token: mapboxToken,
              geometries: "geojson",
              overview: "full",
            });

            const coordinates = waypointCoords
              .map((coord) => coord.join(","))
              .join(";");
            const directionsResponse = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${directionsParams.toString()}`,
            );

            if (directionsResponse.ok) {
              const directionsData = await directionsResponse.json();
              if (directionsData.routes && directionsData.routes.length > 0) {
                // Extract route coordinates and create bounding box
                const routeGeometry = directionsData.routes[0].geometry;
                if (routeGeometry && routeGeometry.coordinates) {
                  const routeCoords = routeGeometry.coordinates;

                  // Calculate bounding box from route coordinates
                  let minLon = Infinity,
                    minLat = Infinity;
                  let maxLon = -Infinity,
                    maxLat = -Infinity;

                  routeCoords.forEach((coord: [number, number]) => {
                    const [lon, lat] = coord;
                    minLon = Math.min(minLon, lon);
                    minLat = Math.min(minLat, lat);
                    maxLon = Math.max(maxLon, lon);
                    maxLat = Math.max(maxLat, lat);
                  });

                  // Add some padding to the bounding box to include nearby areas
                  const padding = 0.01; // approximately 1km
                  const bbox = `${minLon - padding},${minLat - padding},${maxLon + padding},${maxLat + padding}`;
                  queryParams.set("bbox", bbox);
                }
              }
            }
          }
        }

        const response = await fetch(`${endpoint}?${queryParams.toString()}`);

        if (!response.ok) {
          const text = await response.text();
          console.error("Error searching locations", {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body: text,
          });
          return `Error searching locations: ${text}`;
        }

        const result: MapboxSearchResult = await response.json();
        await searchBlob.putJSON(result);
        return result;
      } catch (error) {
        console.error("Error searching locations", error);
        return `Error searching locations: ${error instanceof Error ? error.message : String(error)}`;
      }
    });

    if (typeof data === "string") {
      console.error("Error searching locations", data);
      return data; // Return error message
    }

    const result = formatSearchResults(data);
    return result;
  },
});

function formatSearchResults(data: MapboxSearchResult): string {
  if (!data.features || data.features.length === 0) {
    return "No results found for the search query.";
  }

  const results = data.features.map((feature, index) => {
    const { properties, geometry } = feature;
    const coordinates = geometry.coordinates;

    let result = `${index + 1}. ${properties.name}\n`;
    result += `   Coordinates: ${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}\n`;
    result += `   Type: ${properties.feature_type}\n`;

    if (properties.full_address) {
      result += `   Address: ${properties.full_address}\n`;
    } else if (properties.address) {
      result += `   Address: ${properties.address}\n`;
    }
    if (properties.poi_category && properties.poi_category.length > 0) {
      result += `   Categories: ${properties.poi_category.join(", ")}\n`;
    }
    if (properties.brand && properties.brand.length > 0) {
      result += `   Brand: ${properties.brand.join(", ")}\n`;
    }
    if (properties.maki) {
      result += `   Icon: ${properties.maki}\n`;
    }

    return result;
  });

  return `Found ${data.features.length} results:\n\n${results.join("\n")}`;
}
