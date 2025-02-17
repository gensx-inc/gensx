"use client";
import { useState, useEffect, useMemo } from "react";
import { TypingAnimation } from "./typing-animation";
import { cn } from "@/lib/utils";

interface CyclingTypingAnimationProps {
  texts: string[];
  typingDuration?: number; // duration per character in ms
  pauseDuration?: number; // additional pause after finishing a word (in ms)
  delay?: number; // any initial delay before typing starts (in ms)
  className?: string;
  as?: React.ElementType;
}

/**
 * CyclingTypingAnimation wraps the TypingAnimation component so that it cycles
 * through an array of strings. It calculates the time needed for each text (based on its length)
 * and switches to the next text after that period.
 *
 * To prevent layout shifts or line wrapping caused by varying text lengths, it reserves a fixed
 * width using an invisible placeholder containing the longest string, and ensures no wrapping occurs.
 */
export function CyclingTypingAnimation({
  texts,
  typingDuration = 100,
  pauseDuration = 2000,
  delay = 0,
  className,
  as,
  ...props
}: CyclingTypingAnimationProps) {
  const [index, setIndex] = useState(0);

  // Compute the longest text to reserve space.
  const maxText = useMemo(() => {
    return texts.reduce(
      (prev, cur) => (cur.length > prev.length ? cur : prev),
      "",
    );
  }, [texts]);

  useEffect(() => {
    // Determine the total time required to show the current text.
    // (text length * typingDuration) + pauseDuration + any additional delay.
    const currentText = texts[index];
    const totalTime =
      currentText.length * typingDuration + pauseDuration + delay;
    const timer = setTimeout(() => {
      setIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, totalTime);

    return () => clearTimeout(timer);
  }, [index, texts, typingDuration, pauseDuration, delay]);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {/* Invisible placeholder to reserve full width */}
      <span style={{ visibility: "hidden", whiteSpace: "nowrap" }}>
        {maxText}
      </span>
      {/* The actual TypingAnimation is absolutely positioned on top */}
      <TypingAnimation
        style={{ position: "absolute", left: 0, top: 0 }}
        className={cn(
          "text-4xl font-bold leading-[5rem] tracking-[-0.02em]",
          className,
        )}
        duration={typingDuration}
        delay={delay}
        as={as}
        {...props}
      >
        {texts[index]}
      </TypingAnimation>
    </span>
  );
}
