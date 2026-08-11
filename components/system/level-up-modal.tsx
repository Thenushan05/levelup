"use client";

import { motion } from "framer-motion";
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
      <DialogContent showCloseButton={false} className="system-panel system-panel-violet max-w-sm border-0 text-center">
        <DialogTitle className="sr-only">Level Up</DialogTitle>
        {levelUp && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <Sparkles className="h-8 w-8 text-glow-violet" />
            <p className="label-system-accent tracking-[0.3em]">LEVEL UP</p>
            <div className="flex items-center gap-3 font-heading text-3xl">
              <span className="text-muted-foreground">LV.{levelUp.fromLevel}</span>
              <span className="text-glow-cyan">→</span>
              <span className="text-glow-cyan">LV.{levelUp.toLevel}</span>
            </div>
            {levelUp.rankChanged && (
              <p className="heading-system text-sm text-glow-violet">
                RANK UP — {levelUp.toRank} RANK
              </p>
            )}
            <p className="heading-system text-xs tracking-widest text-muted-foreground">
              NEW LEVEL ACHIEVED
            </p>
            <Button onClick={onClose} className="mt-2 w-full heading-system tracking-widest">
              CONTINUE
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
