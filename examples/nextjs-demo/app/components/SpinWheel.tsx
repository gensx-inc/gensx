"use client";

import { useState, useRef } from "react";

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
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelSegment | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Calculate segment angles
  const segmentAngle = 360 / segments.length;

  // Function to spin the wheel
  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    // Random number of full rotations (3-10) plus a random segment
    const randomSegmentIndex = Math.floor(Math.random() * segments.length);
    const segmentRotation = randomSegmentIndex * segmentAngle;
    const fullRotations = (Math.floor(Math.random() * 8) + 3) * 360;

    // Calculate final rotation (we subtract the segment rotation because the wheel rotates clockwise)
    const newRotation = rotation + fullRotations - segmentRotation;

    setRotation(newRotation);

    // Determine the winner after spin ends
    setTimeout(() => {
      const winningSegment = segments[randomSegmentIndex];
      setWinner(winningSegment);
      setIsSpinning(false);
      if (onSpinEnd) {
        onSpinEnd(winningSegment);
      }
    }, spinDuration * 1000);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
        {/* Wheel */}
        <div
          ref={wheelRef}
          className="absolute w-full h-full rounded-full overflow-hidden transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? `transform ${spinDuration}s cubic-bezier(0.2, 0.8, 0.2, 1)`
              : "none",
          }}
        >
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              className="absolute origin-bottom-right"
              style={{
                width: "50%",
                height: "50%",
                transform: `rotate(${index * segmentAngle}deg)`,
                transformOrigin: "bottom left",
                left: "50%",
                top: "0",
                overflow: "hidden",
                zIndex: 5,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "200%",
                  height: "200%",
                  left: "-100%",
                  transformOrigin: "center",
                  transform: `rotate(${segmentAngle / 2}deg)`,
                  backgroundColor: segment.color,
                  clipPath: "polygon(100% 50%, 50% 100%, 0 50%, 50% 0)",
                }}
              >
                <div
                  className="absolute w-full h-full flex items-center justify-center text-white font-bold"
                  style={{
                    transform: `rotate(${index * -segmentAngle - 90}deg)`,
                    transformOrigin: "center",
                    fontSize: `${Math.max(12, wheelSize / 25)}px`,
                    textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
                    paddingBottom: `${wheelSize / 3}px`,
                  }}
                >
                  {segment.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Center point */}
        <div
          className="absolute rounded-full bg-white border-4 border-gray-800 z-10"
          style={{
            width: wheelSize / 10,
            height: wheelSize / 10,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Pointer */}
        <div
          className="absolute z-20"
          style={{
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: `${wheelSize / 20}px solid transparent`,
            borderRight: `${wheelSize / 20}px solid transparent`,
            borderTop: `${wheelSize / 10}px solid #ff5722`,
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
