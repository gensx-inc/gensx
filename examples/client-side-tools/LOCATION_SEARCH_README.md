# Location Search Tool

This tool provides advanced location search capabilities using Mapbox's Search APIs. It enables searching for places, businesses, and points of interest with advanced filtering options.

## Features

- **Area-based search**: Search within specific geographic areas using bounding boxes
- **Waypoint-based search**: Search along routes between waypoints by calculating the route geometry and creating a bounding box around it
- **Category filtering**: Filter by specific categories (restaurants, hotels, gas stations, etc.)
- **Proximity search**: Search around specific coordinates with customizable radius
- **Multi-language support**: Get results in different languages
- **Country-specific searches**: Limit searches to specific countries
- **Caching**: Results are cached to improve performance and reduce API calls

## Setup

### 1. Get a Mapbox Access Token

1. Go to [Mapbox](https://www.mapbox.com/) and create an account
2. Navigate to your account dashboard
3. Create a new access token or use your default public token
4. Copy the token

### 2. Set Environment Variable

Add your Mapbox access token to your environment variables:

```bash
export MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

Or add it to your `.env` file:

```
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

### 3. Update Deployment

The deployment script has been updated to include the MAPBOX_ACCESS_TOKEN environment variable.

## Usage Examples

### Basic Search

```typescript
// Search for restaurants
locationSearch({
  query: "restaurant",
  category: "restaurant",
});
```

### Proximity Search

```typescript
// Search for coffee shops near a specific location
locationSearch({
  query: "coffee",
  proximity: "-74.006,40.7128", // New York coordinates
  radius: 2000, // 2km radius
});
```

### Area-based Search

```typescript
// Search within a specific bounding box
locationSearch({
  query: "hotel",
  bbox: "-74.1,40.7,-73.9,40.8", // Manhattan area
});
```

### Route-based Search

```typescript
// Search for gas stations along a route
locationSearch({
  query: "gas station",
  route: "-74.006,40.7128;-73.935,40.7306", // Route coordinates
});
```

### Waypoint-based Search

```typescript
// Search for gas stations along a route between waypoints
// The tool calculates the actual driving route and creates a bounding box around it
locationSearch({
  query: "gas station",
  waypoints: "-74.006,40.7128;-73.935,40.7306", // Waypoint coordinates
});
```

### Category-specific Search

```typescript
// Search for parking near landmarks
locationSearch({
  query: "parking",
  category: "parking",
  proximity: "-74.006,40.7128",
});
```

## Parameters

- `query` (required): Search query for places, businesses, or points of interest
- `searchType` (optional): Type of search ("poi", "address", "category")
- `category` (optional): Category filter (e.g., "restaurant", "hotel", "gas_station")
- `bbox` (optional): Bounding box as "minLon,minLat,maxLon,maxLat"
- `proximity` (optional): Center point for proximity search as "longitude,latitude"
- `radius` (optional): Radius in meters for proximity search (default: 5000)
- `waypoints` (optional): Waypoints as "lon1,lat1;lon2,lat2;lon3,lat3" to search along a route between these points
- `limit` (optional): Maximum number of results (default: 10, max: 50)
- `language` (optional): Language for results (default: "en")
- `country` (optional): Country code to limit search
- `types` (optional): Comma-separated list of place types

## Categories

Common categories include:

- `restaurant` - Restaurants and dining
- `hotel` - Hotels and accommodations
- `gas_station` - Gas stations and fuel
- `parking` - Parking facilities
- `hospital` - Hospitals and medical facilities
- `school` - Schools and educational institutions
- `shopping` - Shopping centers and retail
- `entertainment` - Entertainment venues
- `transportation` - Transportation hubs

## Rate Limiting

The tool includes rate limiting to respect Mapbox API limits:

- 5 requests per second
- Maximum 2 concurrent requests
- 30-second maximum delay

## Caching

Results are cached using blob storage to improve performance and reduce API calls. Cache keys are based on a hash of all search parameters.

## Integration with Map Tools

The location search tool works seamlessly with other map tools:

1. Use `locationSearch` to find places
2. Use `moveMap` to show the area
3. Use `placeMarkers` to highlight found locations
4. Use `calculateAndShowRoute` for navigation to selected places (uses Mapbox Directions API)

## Error Handling

The tool includes comprehensive error handling:

- Missing API token detection
- Network error handling
- Invalid parameter validation
- Graceful fallbacks for failed requests
