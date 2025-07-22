"use client";

import { Modal } from "@/components/ui/modal";
import { MapPin, MessageCircle, Search, Navigation } from "lucide-react";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome to GenSX Map Explorer"
    >
      <div className="space-y-6 text-slate-700">
        {/* Introduction */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm leading-relaxed">
            Explore the world through AI-powered conversations! Ask me about any
            location and watch as I interact with the map in real-time.
          </p>
        </div>

        {/* Call to Action */}
        <div className="text-center pb-4 border-b border-white/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            Start Exploring
          </button>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800 text-center">
            What I Can Do
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Navigate to Places</div>
                <div className="text-xs text-slate-600">
                  I can move the map to any location you mention
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
                  Add markers with photos and descriptions
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
                  I can give directions between multiple locations
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
                  Find current information about places
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Toast Notifications</div>
                <div className="text-xs text-slate-600">
                  See real-time updates as I work
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
                className="w-full text-left text-xs bg-slate-100/50 rounded-lg p-3 hover:bg-slate-200/50 transition-colors duration-200 cursor-pointer group"
              >
                <div className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors duration-200">
                  &ldquo;{example.prompt}&rdquo;
                </div>
                <div className="text-slate-600 mt-1">{example.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center pt-4 border-t border-white/20">
          <p className="text-sm text-slate-600 mb-4">
            Just type your request in the floating chat bar below and watch the
            magic happen!
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </Modal>
  );
}
