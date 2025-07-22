# Client-Side Tools

This example demonstrates a full-screen map interface with AI-powered location services and voice input capabilities. The app allows users to interact with an interactive map through both text and voice commands.

## Features

### 🗺️ Interactive Map

- **Interactive Map**: Powered by Leaflet.js with OpenStreetMap tiles
- **Geographic Tool Calling**: AI can control the map through various tools:
  - Move the map to specific coordinates
  - Place markers with custom titles and descriptions
  - Remove individual markers or clear all markers
  - Search for locations by name
  - Get current map view information
  - Calculate and display turn-by-turn directions with multiple stops
  - Clear displayed routes from the map
- **Real-time Chat**: Powered by GenSX with Claude Sonnet 4
- **Web Search Integration**: AI can search the web for current information

### 🎤 Voice Input

- **Voice-to-Text**: Click the microphone button to record voice commands
- **Automatic Transcription**: Speech is converted to text using Groq's Whisper API
- **Auto-Submit**: Voice input automatically submits after transcription
- **Visual Feedback**: Real-time audio visualization during recording
- **Seamless Integration**: Works with all map commands and natural language queries

### 💬 Chat Interface

- **Floating Input Bar**: Glass morphism design with high contrast
- **Toast Notifications**: Real-time feedback for all tool operations
- **Chat History**: Optional floating chat history on the right side
- **Instructions Modal**: Welcome guide for first-time users
- **Responsive Design**: Works on desktop and mobile devices

### 🛠️ Tools Available

- `moveMap`: Navigate to any location
- `placeMarkers`: Add markers with custom labels
- `removeMarker`: Remove specific markers
- `clearMarkers`: Clear all markers
- `getCurrentView`: Get current map coordinates and zoom
- `listMarkers`: Show all current markers
- `getUserLocation`: Get user's current location
- `calculateAndShowRoute`: Calculate and display turn-by-turn directions with multiple stops
- `clearDirections`: Clear displayed routes from the map

## Voice Commands Examples

You can use natural language with voice input:

- **Navigation**: "Show me Paris", "Take me to Tokyo", "Go to the Eiffel Tower"
- **Markers**: "Add a marker at Central Park", "Place a restaurant marker here"
- **Directions**: "Show me directions to Central Park from my location", "Plan a route from my hotel to the museum, then to the restaurant"
- **Information**: "Where am I?", "What's the current location?", "List all markers"
- **Management**: "Clear all markers", "Remove the last marker"

## Setup

1. Clone the repository and navigate to this example:

   ```bash
   cd examples/client-side-tools
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:

   ```bash
   # Tavily API key for web search functionality
   TAVILY_API_KEY=your_tavily_api_key_here

   # Groq API key for voice transcription
   GROQ_API_KEY=your_groq_api_key_here

   # Mapbox access token for routing and location search
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_MAPBOX_ACCESS_TOKEN_here
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3002](http://localhost:3002) in your browser

## Getting API Keys

1. Sign up at [tavily.com](https://tavily.com)
2. Create a new API key
3. Add it to your `.env.local` file

### Groq API Key (for Voice)

1. Sign up at [console.groq.com](https://console.groq.com)
2. Create a new API key
3. Add it to your `.env.local` file

### Mapbox API Key (for Routing and Location Search)

1. Sign up at [mapbox.com](https://mapbox.com)
2. Create a new access token
3. Add it to your `.env.local` file as `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

**Note**: Voice functionality requires a valid Groq API key. Without it, only text input will work. Routing and location search require a valid Mapbox API key.

## Architecture

### Voice Processing Pipeline

1. **Audio Capture**: Browser's `MediaRecorder` API captures microphone input
2. **Real-time Visualization**: Audio levels are visualized during recording
3. **Transcription**: Audio is sent to Groq's Whisper API for speech-to-text
4. **Auto-submission**: Transcribed text is automatically submitted to the AI

### AI Integration

- **GenSX Workflows**: Powered by GenSX for AI orchestration
- **Tool Implementations**: Direct integration with Leaflet map API
- **Toast Notifications**: Real-time feedback for all operations
- **Error Handling**: Graceful error handling with user-friendly messages

- **Glass Morphism**: Modern blur effects throughout the interface
- **Responsive Design**: Optimized for both desktop and mobile
- **Accessibility**: Keyboard navigation and screen reader support
- **Performance**: Optimized animations and efficient rendering

## Routing Service

The directions functionality uses the Mapbox Directions API which provides:

- **High-quality routing**: Accurate turn-by-turn directions
- **Multiple transport modes**: Driving, walking, and cycling
- **Global coverage**: Comprehensive worldwide routing
- **Reliable service**: Production-ready API with high uptime

For setup, you'll need:

1. A Mapbox access token (sign up at [mapbox.com](https://mapbox.com))
2. Set the environment variable: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here`

The routing service supports:

- **Multiple waypoints**: Plan routes with intermediate stops
- **Custom labels**: Add descriptive labels for start, end, and waypoints
- **Transport modes**: Driving, walking, and cycling
- **Real-time updates**: Routes are calculated and displayed immediately

## Usage Examples

### Text Input

Type any natural language command:

- "Show me the Golden Gate Bridge"
- "Add a marker at Times Square labeled 'Meeting Point'"
- "What's my current location?"
- "Show me directions to Central Park from my location"

### Voice Input

1. Click the microphone button (🎤)
2. Speak your command clearly
3. The button will show a stop icon (⏹️) while recording
4. Audio levels are visualized in real-time
5. "Transcribing..." appears while processing
6. Command is automatically executed once transcribed

### Interactive Features

- **Logo Button**: Click to show instructions modal
- **Chat Toggle**: Click message icon to show/hide chat history
- **Auto-scroll**: Chat history automatically scrolls to new messages
- **Keyboard Shortcuts**: Enter to submit, Shift+Enter for new line

## Development

### Adding New Tools

1. Define the tool in `gensx/workflows.ts`
2. Add implementation in the `toolImplementations` object in `app/page.tsx`
3. Add toast notifications for user feedback
4. Update this README with the new functionality

### Customizing Voice

- Adjust audio visualization in `components/VoiceButton.tsx`
- Modify transcription API in `app/api/transcribe/route.ts`
- Change auto-submit behavior in `components/ChatInput.tsx`

### Styling

- Glass morphism styles are defined throughout the components
- Tailwind CSS is used for responsive design
- Custom animations for voice visualization and transitions

## Troubleshooting

### Voice Not Working

1. **Check API Key**: Ensure `GROQ_API_KEY` is set in `.env.local`
2. **Browser Permissions**: Allow microphone access when prompted
3. **HTTPS Required**: Voice recording requires HTTPS in production
4. **Network Issues**: Check console for API errors

### Common Issues

- **Microphone Permission**: Browser will prompt for microphone access
- **API Rate Limits**: Groq has usage limits for free tier
- **Network Connectivity**: Both Groq and Tavily APIs require internet access
- **Browser Compatibility**: Modern browsers required for voice features

## Learn More

- [GenSX Documentation](https://gensx.com/docs)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [OSRM Documentation](http://project-osrm.org/)

This example showcases the power of GenSX for building interactive AI applications with seamless voice integration, real-time map manipulation, and turn-by-turn directions.
