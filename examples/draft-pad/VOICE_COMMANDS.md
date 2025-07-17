# Voice Commands in Draft Pad

The Draft Pad application now supports intelligent voice commands powered by AI that allow you to control the UI and perform actions using natural language. This feature uses an LLM (Large Language Model) to understand your intent and provides much more accurate command recognition than traditional pattern matching.

## How to Use Voice Commands

1. **Start Recording**: Click the microphone button or use the voice button when no text is in the input field
2. **Speak Your Command**: Say one of the supported commands listed below using natural language
3. **Stop Recording**: Click the stop button (square icon) or the recording will automatically stop after a pause
4. **AI Processing**: The app sends your speech to an AI model that understands your intent and converts it to structured actions
5. **Command Execution**: The parsed action is executed and you'll see a green notification confirming what happened
6. **Feedback**: Visual feedback shows you exactly what the system understood and did

## Supported Voice Commands

### 🤖 Model Selection Commands

The AI understands natural language references to models and can intelligently match them to available models:

#### Add Models

- `"add GPT"` - Add GPT/OpenAI models to selection
- `"add Claude and Gemini"` - Add multiple models by name
- `"select OpenAI models"` - Add all OpenAI models
- `"include Anthropic"` - Add Anthropic/Claude models
- `"use Groq and Meta models"` - Add models by provider
- `"add the fast models"` - AI can understand descriptive references

#### Remove Models

- `"remove GPT"` - Remove GPT/OpenAI models from selection
- `"deselect Claude"` - Remove Claude/Anthropic models
- `"exclude OpenAI"` - Remove OpenAI models
- `"drop the slow models"` - AI understands contextual descriptions

#### Select Only (Replace Selection)

- `"only use GPT"` - Replace current selection with only GPT models
- `"just use Claude"` - Replace with only Claude models
- `"switch to Anthropic"` - Switch to only Anthropic models
- `"use only the fastest model"` - AI can understand qualitative descriptions

#### Clear All

- `"clear all models"` - Remove all selected models
- `"deselect everything"` - Remove all selected models
- `"start over with models"` - Remove all models

#### Multi-Select Mode

- `"enable multi-select"` - Turn on multi-select mode
- `"turn on multi-select"` - Turn on multi-select mode
- `"disable multi-select"` - Turn off multi-select mode
- `"toggle multi-select"` - Switch multi-select mode on/off

### 📊 Sorting Commands

The AI understands various ways to describe sorting criteria:

#### Sort Generations

- `"sort by time"` - Sort generations by generation time
- `"sort by speed"` - Sort by generation speed (same as time)
- `"sort by words"` - Sort by word count
- `"sort by length"` - Sort by content length
- `"sort by cost"` - Sort by generation cost
- `"order by fastest first"` - AI understands directional sorting

#### Sort Models

- `"sort models by cost"` - Sort available models by cost
- `"sort models by price"` - Sort by cost (AI understands synonyms)
- `"sort models by context window"` - Sort by context length
- `"arrange models by output limit"` - Sort by max output length

### 🔄 Diff Control Commands

Show or hide differences between versions:

- `"show diff"` - Display the diff view
- `"hide diff"` - Hide the diff view
- `"toggle diff"` - Switch diff display on/off
- `"display the differences"` - Show the diff view
- `"turn on diff mode"` - Show the diff view
- `"turn off diff mode"` - Hide the diff view

### 📚 Version Navigation Commands

Navigate between different generations/versions:

#### Navigate Versions

- `"previous version"` - Go to the previous version
- `"next version"` - Go to the next version
- `"go back"` - Go to previous version
- `"go forward"` - Go to next version
- `"earlier version"` - Go to previous version

#### Go to Specific Version

- `"go to version 3"` - Navigate to version 3
- `"show version 2"` - Navigate to version 2
- `"jump to version 5"` - Navigate to version 5

#### Go to Latest

- `"latest version"` - Go to the most recent version
- `"current version"` - Go to the latest version
- `"newest version"` - Go to the latest version
- `"most recent"` - Go to the latest version

### 🎛️ UI Control Commands

Control the user interface:

#### Model Selector

- `"open model selector"` - Open the full-screen model selector
- `"show all models"` - Open the model selector
- `"choose models"` - Open the model selector
- `"close model selector"` - Close the model selector
- `"hide the models"` - Close the model selector

#### Input Focus

- `"focus input"` - Focus on the text input field
- `"go to text box"` - Focus on the input field
- `"cursor in input"` - Focus on the input field

## Intelligent Model Recognition

The AI-powered system recognizes models and providers in many different ways:

### Flexible Model References

- **GPT/OpenAI**: "GPT", "Chat GPT", "ChatGPT", "OpenAI", "GPT models", "the OpenAI ones"
- **Claude/Anthropic**: "Claude", "Anthropic", "Claude models", "the Anthropic model"
- **Gemini/Google**: "Gemini", "Google", "Google models", "the Google one"
- **Llama/Meta**: "Llama", "Meta", "Facebook models", "the Meta models"
- **Groq**: "Groq", "Groq models"
- **And more**: The system intelligently matches based on context

### Smart Context Understanding

The AI can understand:

- `"add the cheap models"` → Adds low-cost models
- `"remove the expensive ones"` → Removes high-cost models
- `"only use the fast models"` → Selects models known for speed
- `"add all the reasoning models"` → Adds models good at reasoning

### Multiple Model Selection

- `"add GPT and Claude"` → Adds both OpenAI and Anthropic models
- `"select OpenAI, Google, and Meta"` → Adds models from all three providers
- `"use Claude, Gemini, and Groq"` → Smart multi-provider selection

## Advanced Features

### Natural Language Understanding

The system goes beyond simple keyword matching:

- **Synonyms**: "cost" = "price" = "expense"
- **Context**: "fast" models = low generation time
- **Descriptions**: "the good ones" = high-quality models
- **Quantities**: "add a few models" vs "add many models"

### Fallback Behavior

If a voice input isn't recognized as a command, it automatically becomes text input for generation. This means you can seamlessly switch between:

- Voice commands: `"add Claude"`
- Text generation: `"Write a story about space exploration"`

### Error Handling

- **Network issues**: Graceful fallback to text input
- **API errors**: Automatic retry with degraded functionality
- **Unclear commands**: Smart interpretation or fallback to text

## Tips for Best Results

### Speaking Naturally

- Use conversational language - the AI understands natural speech
- Don't worry about exact phrasing - multiple variations work
- Speak clearly but naturally - no need for robotic commands
- Use descriptive language when helpful

### Examples of Natural Commands

Instead of rigid commands like:

- ❌ `"MODEL_SELECTION_ADD_GPT_FOUR"`

Use natural language like:

- ✅ `"add GPT to my selection"`
- ✅ `"I want to use Claude too"`
- ✅ `"include some Google models"`
- ✅ `"let's try the OpenAI ones"`

### Getting Better Results

- **Be specific when needed**: "add Claude 3" vs "add Claude"
- **Use context**: "add the fastest model" vs just "add fast"
- **Combine actions**: "clear all models and add just GPT"

## Architecture

The new voice command system uses advanced AI for much better accuracy:

### LLM-Powered Parsing (`/api/voice-commands`)

- Uses GPT-4o-mini for intelligent command understanding
- Structured output with Zod schema validation
- Context-aware parsing with full model information
- Handles synonyms, variations, and natural language

### Enhanced Voice Processor (`VoiceCommandProcessor`)

- Async API calls to LLM parser
- Rich model context passed to AI
- Intelligent fallback handling
- Type-safe action generation

### Smart Action Execution (`VoiceActionsInterface`)

- Context-aware model matching
- Provider-based intelligent selection
- Real-time feedback and error handling
- Seamless integration with existing UI

## Troubleshooting

### Commands Not Working

1. **Check Internet Connection**: LLM processing requires network access
2. **Verify Microphone**: Ensure browser has microphone permissions
3. **Speak Clearly**: Clear speech improves transcription accuracy
4. **Try Variations**: The AI understands many ways to say the same thing

### Common Issues

- **"Command not understood"**: Try rephrasing in simpler terms
- **"Wrong models selected"**: Be more specific about which models you want
- **"No response"**: Check network connection and try again

### Getting Help

- **Use natural language**: Describe what you want to do
- **Be specific**: Include model names or providers when possible
- **Check feedback**: The green notifications show what the system understood

## Examples in Action

### Complete Workflow with Natural Language

1. `"open the model selector"`
2. `"add GPT and Claude"`
3. `"enable multi-select mode"`
4. `"Write a comprehensive guide about AI"`
5. `"sort the results by speed"`
6. `"show me the differences"`
7. `"go to the previous version"`

### Smart Model Management

1. `"clear everything"`
2. `"add the best models from OpenAI and Anthropic"`
3. `"remove any expensive ones"`
4. `"just keep Claude for now"`

The AI-powered voice command system makes Draft Pad much more intuitive and accessible, understanding natural language commands with high accuracy and providing intelligent model selection based on your needs.
