import { WheelSegment } from "../components/SpinWheel";

// Default swag wheel configuration
export const defaultSwagSegments: WheelSegment[] = [
  {
    id: "tshirt",
    label: "T-Shirt",
    color: "#FF5722", // Deep Orange
  },
  {
    id: "stickers",
    label: "Stickers Pack",
    color: "#2196F3", // Blue
  },
  {
    id: "mug",
    label: "Coffee Mug",
    color: "#4CAF50", // Green
  },
  {
    id: "notebook",
    label: "Notebook",
    color: "#9C27B0", // Purple
  },
  {
    id: "socks",
    label: "Socks",
    color: "#FFC107", // Amber
  },
  {
    id: "hat",
    label: "Hat",
    color: "#E91E63", // Pink
  },
  {
    id: "water-bottle",
    label: "Water Bottle",
    color: "#00BCD4", // Cyan
  },
  {
    id: "hoodie",
    label: "Hoodie",
    color: "#795548", // Brown
  },
];

// Example of how to create a custom wheel configuration with weighted probabilities
export const createWeightedSegments = (
  segments: WheelSegment[],
): WheelSegment[] => {
  // Clone the segments to avoid modifying the original
  return segments.map((segment) => ({
    ...segment,
    // You can set custom probabilities here
    probability: segment.probability || 1, // Default to equal probability
  }));
};
