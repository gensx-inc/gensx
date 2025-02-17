"use client";

import React from "react";
import { motion } from "framer-motion";

export interface AnimatedArticleProps {
  children: React.ReactNode;
  index?: number; // Allows you to stagger animations if desired
}

export default function AnimatedArticle({
  children,
  index = 0,
}: AnimatedArticleProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      {children}
    </motion.article>
  );
}
