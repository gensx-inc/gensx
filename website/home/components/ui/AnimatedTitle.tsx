"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * AnimatedTitle Component
 *
 * This component animates the title by fading it in and moving it upward slightly.
 * You can pass the title text (or any React node) as children.
 */
interface AnimatedTitleProps {
  children: ReactNode;
}

export default function AnimatedTitle({ children }: AnimatedTitleProps) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="text-center my-0 text-3xl md:text-5xl font-bold mb-16"
    >
      {children}
    </motion.h1>
  );
}
