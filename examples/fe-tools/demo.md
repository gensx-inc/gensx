# Interactive Map Chat Demo

This demo shows how to use the interactive map chat application with frontend tool calling capabilities.

## Quick Start

1. **Start the application**:

   ```bash
   npm run dev
   ```

2. **Open your browser** to `http://localhost:3000`

3. **You'll see a split-screen interface**:
   - Left side: Interactive map (OpenStreetMap)
   - Right side: Chat interface

## Demo Conversations

Try these example conversations to see the map tools in action:

### 1. Basic Location Search

**You**: "Show me New York City on the map"

**AI Response**: The AI will:

- Search for "New York City" coordinates
- Move the map to New York City
- Place a marker at the location
- Provide information about the city

### 2. Multiple Locations

**You**: "Show me the major landmarks in London"

**AI Response**: The AI will:

- Search for London coordinates
- Move the map to London
- Place multiple markers for landmarks like:
  - Big Ben
  - Tower Bridge
  - Buckingham Palace
  - London Eye

### 3. Interactive Markers

**You**: "Place a red marker at Times Square with the title 'Tourist Hotspot'"

**AI Response**: The AI will:

- Search for Times Square coordinates
- Place a red marker with the specified title
- Move the map to show the location

### 4. Weather and Location

**You**: "What's the weather like in Paris?"

**AI Response**: The AI will:

- Search for Paris coordinates
- Move the map to Paris
- Place a marker
- Search the web for current weather information
- Provide weather details

### 5. Map Management

**You**: "Clear all markers and show me Tokyo"

**AI Response**: The AI will:

- Clear all existing markers
- Search for Tokyo coordinates
- Move the map to Tokyo
- Place a new marker

## Map Controls

### Manual Map Interaction

- **Zoom**: Use mouse wheel or zoom controls
- **Pan**: Click and drag to move around
- **Add Markers**: Click the "Add Marker" button, then click on the map
- **Remove Markers**: Click on a marker's popup and use the "Remove" button
- **Clear All**: Use the "Clear All" button to remove all markers

### Toggle Views

- Click the map/chat icon in the header to toggle between:
  - Split view (map + chat)
  - Chat-only view

## Technical Features Demonstrated

1. **Frontend Tool Calling**: AI can control the map through defined tools
2. **Real-time Interaction**: Map updates happen immediately when AI calls tools
3. **Geographic Search**: Integration with OpenStreetMap Nominatim for location search
4. **Web Search**: AI can search the web for current information about locations
5. **Persistent State**: Map markers and chat history are maintained during the session
6. **Responsive Design**: Works on different screen sizes

## Tool Definitions

The application demonstrates these frontend tools:

- `moveMap`: Control map position and zoom
- `placeMarker`: Add markers with custom properties
- `removeMarker`: Remove specific markers
- `clearMarkers`: Remove all markers
- `searchLocation`: Find coordinates for place names
- `getCurrentView`: Get current map state

## Next Steps

After trying the demo, you can:

1. **Extend the tools**: Add new map functionality like drawing routes or polygons
2. **Customize the AI**: Modify the system prompt to focus on specific domains
3. **Add data sources**: Integrate weather APIs, traffic data, or other geographic services
4. **Enhance the UI**: Add more map controls or improve the chat interface

## Troubleshooting

- **Map not loading**: Check your internet connection (requires OpenStreetMap tiles)
- **AI not responding**: Ensure your API keys are set in `.env.local`
- **Tools not working**: Check the browser console for any JavaScript errors
