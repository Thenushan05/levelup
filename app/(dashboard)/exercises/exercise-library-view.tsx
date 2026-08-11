"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItemDTO } from "@/actions/progress";

export function ExerciseLibraryView({ exercises }: { exercises: ExerciseLibraryItemDTO[] }) {
  const muscleGroups = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.muscleGroup))).sort(),
    [exercises]
  );
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? exercises.filter((e) => e.muscleGroup === filter) : exercises;

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>Exercise Library</SystemLabel>
        <SystemHeading className="mt-1">All Objectives</SystemHeading>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={cn(
            "heading-system rounded-full border px-3 py-1 text-xs tracking-wide",
            !filter ? "border-primary bg-primary/10 text-glow-cyan" : "border-border text-muted-foreground"
          )}
        >
          ALL
        </button>
        {muscleGroups.map((mg) => (
          <button
            type="button"
            key={mg}
            onClick={() => setFilter(mg)}
            className={cn(
              "heading-system rounded-full border px-3 py-1 text-xs tracking-wide",
              filter === mg ? "border-primary bg-primary/10 text-glow-cyan" : "border-border text-muted-foreground"
            )}
          >
            {mg.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ex) => (
          <Link key={ex.slug} href={`/exercises/${ex.slug}`}>
            <SystemPanel noMotion className="flex items-center gap-3 transition-colors hover:bg-accent/40">
              <Dumbbell className="h-5 w-5 shrink-0 text-glow-cyan" />
              <div>
                <p className="heading-system text-sm">{ex.name}</p>
                <SystemLabel>{ex.muscleGroup}</SystemLabel>
              </div>
            </SystemPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
