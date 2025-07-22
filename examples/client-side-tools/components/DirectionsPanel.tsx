import { RouteData } from "@/hooks/useMapTools";
import { X, Navigation, MapPin } from "lucide-react";

interface DirectionsPanelProps {
  route: RouteData | null;
  onClose: () => void;
}

export function DirectionsPanel({ route, onClose }: DirectionsPanelProps) {
  if (!route) return null;

  const formatTransportMode = (profile: string) => {
    switch (profile) {
      case "driving-car":
        return "🚗 Driving";
      case "foot-walking":
        return "🚶 Walking";
      case "cycling-regular":
        return "🚴 Cycling";
      default:
        return profile.replace("-", " ");
    }
  };

  const getInstructionIcon = (type: number) => {
    // Basic instruction type mapping for OpenRouteService
    switch (type) {
      case 0:
      case 1:
        return "⬆️"; // Continue/straight
      case 2:
        return "↗️"; // Turn slight right
      case 3:
        return "➡️"; // Turn right
      case 4:
        return "↘️"; // Turn sharp right
      case 5:
        return "⬇️"; // U-turn
      case 6:
        return "↙️"; // Turn sharp left
      case 7:
        return "⬅️"; // Turn left
      case 8:
        return "↖️"; // Turn slight left
      default:
        return "📍"; // Default
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border max-w-sm w-80 max-h-96 overflow-hidden z-[1000]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-sm">Directions</h3>
            <p className="text-xs text-gray-600">
              {formatTransportMode(route.profile)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Route Summary */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-lg font-bold text-gray-900">
            {route.distanceText}
          </div>
          <div className="text-lg font-bold text-blue-600">
            {route.durationText}
          </div>
        </div>
      </div>

      {/* Directions List */}
      <div className="overflow-y-auto max-h-64">
        {route.directions.map((direction, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50"
          >
            <div className="text-lg mt-1 flex-shrink-0">
              {getInstructionIcon(direction.type || 0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 leading-relaxed">
                {direction.instruction}
              </p>
              {direction.name && (
                <p className="text-xs text-gray-600 mt-1">
                  on {direction.name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatDistance(direction.distance)}
                </span>
                {direction.duration > 0 && (
                  <span className="text-xs text-gray-500">
                    • {Math.round(direction.duration / 60)}min
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50 text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>Powered by OSRM</span>
        </div>
      </div>
    </div>
  );
}
