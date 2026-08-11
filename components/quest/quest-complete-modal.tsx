"use client";

import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/dates";
import type { AchievementUnlockedDTO, DailyWorkoutDTO } from "@/types";

export interface QuestCompleteData {
  workout: DailyWorkoutDTO;
  xp: number;
  achievements: AchievementUnlockedDTO[];
  weeklyQuestCompleted: boolean;
}

export function QuestCompleteModal({
  data,
  onClose,
}: {
  data: QuestCompleteData | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!data}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="system-panel system-panel-success max-w-sm overflow-hidden text-center"
      >
        <DialogTitle className="sr-only">Quest Complete</DialogTitle>
        {data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative flex flex-col items-center gap-3 py-3"
          >
            <motion.div
              className="pointer-events-none absolute top-6 left-1/2 h-16 w-16 rounded-full"
              style={{ x: "-50%", background: "var(--success)" }}
              initial={{ scale: 0.3, opacity: 0.5, filter: "blur(10px)" }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.05 }}
            >
              <PartyPopper className="h-9 w-9 text-glow-cyan" />
            </motion.div>
            <p className="label-system-accent tracking-[0.35em] text-success">QUEST COMPLETE</p>
            <p className="heading-system text-xl">{data.workout.workoutName.toUpperCase()}</p>
            <p className="heading-system text-sm text-success">
              {data.workout.completedExercises} / {data.workout.totalExercises} OBJECTIVES COMPLETE
            </p>

            <div className="my-2 grid w-full grid-cols-3 gap-2 rounded-lg border border-border/60 p-3 text-center">
              <div>
                <p className="label-system">Duration</p>
                <p className="heading-system text-sm">{formatDuration(data.workout.durationMinutes)}</p>
              </div>
              <div>
                <p className="label-system">Sets</p>
                <p className="heading-system text-sm">{data.workout.completedSets}</p>
              </div>
              <div>
                <p className="label-system">XP Pending</p>
                <p className="heading-system text-sm text-glow-cyan">+{data.xp}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Awaiting admin approval before it counts toward your level.</p>

            {data.weeklyQuestCompleted && (
              <p className="heading-system text-xs text-glow-violet">WEEKLY QUEST COMPLETE — +100 XP PENDING</p>
            )}
            {data.achievements.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {data.achievements.length} achievement{data.achievements.length > 1 ? "s" : ""} unlocked
              </p>
            )}

            <Button onClick={onClose} className="mt-2 w-full">
              CONTINUE
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
