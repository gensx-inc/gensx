"use client";

import { Modal } from "@/components/ui/modal";
import { MapPin, Search, Navigation } from "lucide-react";

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExampleClick?: (example: string) => void;
}

export function InstructionsModal({
  isOpen,
  onClose,
  onExampleClick,
}: InstructionsModalProps) {
  const examples = [
    {
      prompt: "Show me Paris and tell me about the Eiffel Tower",
      description: "I'll navigate to Paris and add a marker with information",
    },
    {
      prompt: "Find the best restaurants in Tokyo",
      description: "I'll search for restaurants and place markers on the map",
    },
    {
      prompt: "What's the weather like in New York?",
      description: "I'll search for current weather and show NYC on the map",
    },
    {
      prompt: "Clear all markers and show me London",
      description: "I'll clean the map and navigate to a new location",
    },
  ];

  const handleExampleClick = (example: string) => {
    onExampleClick?.(example);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ZapMap">
      <div className="space-y-6 text-slate-800">
        {/* Introduction */}
        <div className="text-center">
          <p className="text-sm leading-relaxed">
            An AI powered interactive map that takes commands and executes them.
            You can ask me to navigate to places, add markers, give directions,
            or search for locations.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Navigate to Places</div>
                <div className="text-xs text-slate-600">
                  Moves the map to any location you mention
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Place Markers</div>
                <div className="text-xs text-slate-600">
                  Adds markers with photos and descriptions
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Give Directions</div>
                <div className="text-xs text-slate-600">
                  Gives directions between multiple locations
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Web Search</div>
                <div className="text-xs text-slate-600">
                  Searches the web for current information about places
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800 text-center">
            Try These Examples
          </h3>

          <div className="space-y-2">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example.prompt)}
                className="w-full text-left text-xs bg-white/40 rounded-lg p-3 hover:bg-white/60 transition-colors duration-200 cursor-pointer group border border-white/30 hover:border-white/50"
              >
                <div className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors duration-200">
                  &ldquo;{example.prompt}&rdquo;
                </div>
                <div className="text-slate-600 mt-1">{example.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
