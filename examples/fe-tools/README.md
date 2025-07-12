# Interactive Map Chat Example

This example demonstrates how to build an interactive chat application with frontend tool calling capabilities, specifically focused on geographic interactions. The app features a split-screen layout with an interactive map on the left and a chat interface on the right.

## Features

- **Interactive Map**: Powered by Leaflet.js with OpenStreetMap tiles
- **Geographic Tool Calling**: AI can control the map through various tools:
  - Move the map to specific coordinates
  - Place markers with custom titles and descriptions
  - Remove individual markers or clear all markers
  - Search for locations by name
  - Get current map view information
- **Real-time Chat**: Powered by GenSX with Claude Sonnet 4
- **Web Search Integration**: AI can search the web for current information
- **Chat History**: Persistent conversation history with thread management
- **Responsive Design**: Toggle between map and chat-only views

## Map Tools

The AI assistant has access to several map control tools:

### `moveMap`

Move the map to a specific location with optional zoom level.

```typescript
{
  latitude: number,    // Latitude coordinate
  longitude: number,   // Longitude coordinate
  zoom?: number        // Zoom level (1-20, default 12)
}
```

### `placeMarker`

Place a marker on the map with optional metadata.

```typescript
{
  latitude: number,           // Latitude coordinate
  longitude: number,          // Longitude coordinate
  title?: string,            // Marker popup title
  description?: string,      // Marker popup description
  color?: string             // Marker color (red, blue, green, yellow, purple)
}
```

### `removeMarker`

Remove a specific marker by its ID.

```typescript
{
  markerId: string; // ID of the marker to remove
}
```

### `clearMarkers`

Remove all markers from the map.

```typescript
{
} // No parameters required
```

### `searchLocation`

Search for a location by name and get its coordinates.

```typescript
{
  query: string; // Location search query (e.g., "Times Square, New York")
}
```

### `getCurrentView`

Get the current map view information.

```typescript
{
} // No parameters required
```

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file with:

   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   FIRECRAWL_API_KEY=your_firecrawl_api_key
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Usage Examples

Try asking the AI questions like:

- "Show me New York City on the map"
- "Place a marker at Times Square"
- "What's the weather like in Paris?" (it will search and show Paris on the map)
- "Show me all the major landmarks in London"
- "Clear all markers and show me Tokyo"

The AI will automatically use the appropriate map tools to enhance your experience by showing locations, placing markers, and providing geographic context.

## Architecture

- **Frontend**: Next.js 15 with React 19
- **Map**: React-Leaflet with OpenStreetMap
- **AI**: GenSX with Claude Sonnet 4
- **Tools**: Frontend tool calling with Zod schema validation
- **Styling**: Tailwind CSS
- **State Management**: React hooks for map and chat state

## Key Components

- `Map.tsx`: Interactive map component with marker management
- `useMapTools.ts`: Hook for map state and tool implementations
- `frontendTools.ts`: Tool definitions with Zod schemas
- `agent.ts`: AI agent with geographic focus system prompt
- `workflows.ts`: GenSX workflow with map tools integration

## Customization

You can easily extend this example by:

1. **Adding new map tools**: Define new tools in `frontendTools.ts`
2. **Customizing the map**: Modify the Map component to use different tile providers or add new map features
3. **Enhancing the AI**: Update the system prompt in `agent.ts` to focus on different domains
4. **Adding more data sources**: Integrate additional APIs for weather, traffic, or other geographic data

## Learn More

- [GenSX Documentation](https://gensx.com/docs)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Claude API Documentation](https://docs.anthropic.com/)
