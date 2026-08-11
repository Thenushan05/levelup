"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SystemLabel } from "@/components/system/system-label";
import { updateExerciseNotes } from "@/actions/workout";

export function ExerciseNotesField({
  dailyWorkoutId,
  exerciseEntryId,
  initialNotes,
}: {
  dailyWorkoutId: string;
  exerciseEntryId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setNotes(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updateExerciseNotes({ dailyWorkoutId, exerciseEntryId, notes: value }).catch(() => {});
    }, 800);
  }

  return (
    <div className="space-y-1.5">
      <SystemLabel>Notes</SystemLabel>
      <Textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Optional notes for this objective..."
        className="min-h-16"
      />
    </div>
  );
}
