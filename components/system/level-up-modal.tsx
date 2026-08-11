"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LevelUpResult } from "@/types";

export function LevelUpModal({
  levelUp,
  onClose,
}: {
  levelUp: LevelUpResult | null;
  onClose: () => void;
}) {
  const open = !!levelUp?.leveledUp;

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="system-panel system-panel-violet max-w-sm overflow-hidden text-center"
      >
        <DialogTitle className="sr-only">Level Up</DialogTitle>
        {levelUp && (
          <div className="relative flex flex-col items-center gap-4 py-6">
            {/* Expanding shockwave rings */}
            <AnimatePresence>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute top-1/2 left-1/2 h-20 w-20 rounded-full border"
                  style={{ borderColor: "var(--secondary)", x: "-50%", y: "-50%" }}
                  initial={{ scale: 0.4, opacity: 0.8 }}
                  animate={{ scale: 3.2, opacity: 0 }}
                  transition={{ duration: 1.4, delay: i * 0.25, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }}
                />
              ))}
            </AnimatePresence>

            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ rotate: -25, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              >
                <Sparkles className="h-10 w-10 text-glow-violet" />
              </motion.div>

              <p className="label-system-accent animate-hud-flicker tracking-[0.4em] text-glow-cyan">LEVEL UP</p>

              <div className="flex items-center gap-3 font-heading text-4xl">
                <span className="text-muted-foreground">LV.{levelUp.fromLevel}</span>
                <motion.span
                  className="text-glow-cyan"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                >
                  →
                </motion.span>
                <motion.span
                  className="text-glow-cyan"
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 14 }}
                >
                  LV.{levelUp.toLevel}
                </motion.span>
              </div>

              {levelUp.rankChanged && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="heading-system text-sm text-glow-violet"
                >
                  RANK UP — {levelUp.toRank} RANK
                </motion.p>
              )}

              <p className="heading-system text-xs tracking-widest text-muted-foreground">NEW LEVEL ACHIEVED</p>

              <Button onClick={onClose} className="mt-2 w-full">
                CONTINUE
              </Button>
            </motion.div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
