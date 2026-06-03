"use client";

import { motion, MotionConfig } from "framer-motion";

/** Subtle page transition on each admin navigation. Respects the user's reduced-motion setting. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
