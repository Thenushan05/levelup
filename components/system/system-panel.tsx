"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SystemPanelProps {
  variant?: "cyan" | "violet" | "success";
  noPadding?: boolean;
  className?: string;
  children?: ReactNode;
  delay?: number;
  noMotion?: boolean;
}

export function SystemPanel({
  variant = "cyan",
  noPadding,
  className,
  children,
  delay = 0,
  noMotion,
}: SystemPanelProps) {
  const classes = cn(
    "system-panel",
    variant === "violet" && "system-panel-violet",
    variant === "success" && "system-panel-success",
    !noPadding && "p-4 sm:p-5",
    className
  );

  if (noMotion) {
    return <div className={classes}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className={classes}
    >
      {children}
    </motion.div>
  );
}
