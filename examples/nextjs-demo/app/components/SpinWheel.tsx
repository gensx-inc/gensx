"use client";

import { useState } from "react";

export interface WheelSegment {
  id: string;
  label: string;
  color: string;
  probability?: number; // Optional weighting for segments
}

interface SpinWheelProps {
  segments: WheelSegment[];
  onSpinEnd?: (segment: WheelSegment) => void;
  wheelSize?: number; // Size in pixels
  spinDuration?: number; // Duration in seconds
  buttonText?: string;
}

export default function SpinWheel({
  segments,
  onSpinEnd,
  wheelSize = 400,
  spinDuration = 5,
  buttonText = "Spin the Wheel!",
}: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelSegment | null>(null);

  // Calculate segment angles
  const segmentAngle = 360 / segments.length;

  // Function to spin the wheel
  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    // First, determine the winning segment
    const winningIndex = Math.floor(Math.random() * segments.length);
    const winningSegment = segments[winningIndex];

    // Get the wheel element
    const wheelElement = document.querySelector(".wheel-inner") as HTMLElement;
    if (!wheelElement) return;

    // Reset the wheel's rotation to 0
    wheelElement.style.transition = "none";
    wheelElement.style.transform = "rotate(0deg)";

    // Force a reflow to ensure the reset takes effect
    void wheelElement.offsetHeight;

    // Calculate the final rotation:
    // - Start with 5 full rotations (1800 degrees)
    // - Add the rotation needed to get to the winning segment
    // - The winning segment should end at the top (0 degrees)
    // - Since the wheel rotates clockwise and segments start at 3 o'clock,
    //   we need to rotate (360 - (winningIndex * segmentAngle)) degrees
    const finalRotation = 1800 + (360 - winningIndex * segmentAngle);

    // Apply the spinning animation
    wheelElement.style.transition = `transform ${spinDuration}s cubic-bezier(0.2, 0.8, 0.2, 1)`;
    wheelElement.style.transform = `rotate(${finalRotation}deg)`;

    // Set the winner after the spin
    setTimeout(() => {
      setWinner(winningSegment);
      setIsSpinning(false);
      if (onSpinEnd) {
        onSpinEnd(winningSegment);
      }
    }, spinDuration * 1000);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative"
        style={{
          width: wheelSize,
          height: wheelSize,
        }}
      >
        {/* Wheel */}
        <div
          className="wheel-inner absolute w-full h-full rounded-full overflow-hidden border-8 border-gray-800 shadow-lg"
          style={{
            backgroundColor: "#1a1a1a",
            transform: "rotate(0deg)",
          }}
        >
          {segments.map((segment, index) => {
            // Each segment starts from the 3 o'clock position (0 degrees)
            // and rotates counter-clockwise
            const rotation = index * segmentAngle;

            return (
              <div
                key={segment.id}
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "50% 50%",
                  clipPath: `polygon(50% 50%, 50% 0, ${50 + segmentAngle + 0.5}% 0)`,
                  backgroundColor: segment.color,
                }}
              >
                {/* Segment Text */}
                <div
                  className="absolute text-white font-bold"
                  style={{
                    position: "absolute",
                    left: "50%",
                    width: `${wheelSize * 0.35}px`,
                    transform: `
                      rotate(${segmentAngle / 2}deg)
                      translateY(${wheelSize * 0.15}px)
                      translateX(-50%)
                    `,
                    transformOrigin: "0 50%",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
                    fontSize: Math.max(14, wheelSize / 20),
                    textAlign: "center",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 8px",
                  }}
                >
                  {segment.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center point */}
        <div
          className="absolute rounded-full bg-white border-4 border-gray-800 z-10 shadow-md"
          style={{
            width: wheelSize / 8,
            height: wheelSize / 8,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Pointer */}
        <div
          className="absolute z-20"
          style={{
            top: -5,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: `${wheelSize / 18}px solid transparent`,
            borderRight: `${wheelSize / 18}px solid transparent`,
            borderTop: `${wheelSize / 9}px solid #ff5722`,
            filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      <button
        onClick={spinWheel}
        disabled={isSpinning}
        className={`px-6 py-3 rounded-full text-white font-bold text-lg transition-all ${
          isSpinning
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 active:scale-95"
        }`}
      >
        {isSpinning ? "Spinning..." : buttonText}
      </button>

      {winner && (
        <div className="mt-4 text-xl font-bold">
          You won: <span style={{ color: winner.color }}>{winner.label}</span>!
        </div>
      )}
    </div>
  );
}
