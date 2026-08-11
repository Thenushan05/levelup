"use client";

import Link from "next/link";
import { Apple } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlayerStatusCard } from "@/components/dashboard/player-status-card";
import { DailyQuestCard } from "@/components/dashboard/daily-quest-card";
import { WeeklyQuestCard } from "@/components/dashboard/weekly-quest-card";
import { StreakCard } from "@/components/dashboard/streak-card";
import { AttendanceCard } from "@/components/dashboard/attendance-card";
import { PartyActivityPreview } from "@/components/dashboard/party-activity-preview";
import { LevelUpReveal } from "@/components/system/level-up-reveal";
import type { PlayerStatusDTO } from "@/actions/player";
import type { AttendanceStatusDTO } from "@/actions/attendance";
import type { WeeklyQuestStatusDTO } from "@/actions/progress";
import type { PartySummaryDTO, PartyActivityDTO } from "@/actions/party";
import type { DailyWorkoutDTO } from "@/types";

export function DashboardClient({
  status,
  quest,
  attendance,
  weekly,
  party,
  activity,
}: {
  status: PlayerStatusDTO;
  quest: DailyWorkoutDTO | null;
  attendance: AttendanceStatusDTO;
  weekly: WeeklyQuestStatusDTO | null;
  party: PartySummaryDTO | null;
  activity: PartyActivityDTO[];
}) {
  return (
    <div className="space-y-6">
      {!status.hasBodyStats && (
        <SystemPanel variant="violet" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Apple className="h-5 w-5 shrink-0 text-glow-violet" />
            <div>
              <p className="heading-system text-sm">Unlock Diet &amp; Body</p>
              <p className="text-xs text-muted-foreground">
                Add your weight, height, age, and sex for a real BMI, calorie target, and macro breakdown.
              </p>
            </div>
          </div>
          <Link href="/diet" className={cn(buttonVariants({ variant: "outline" }), "heading-system tracking-wide")}>
            COMPLETE PROFILE
          </Link>
        </SystemPanel>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <PlayerStatusCard status={status} />
        </div>
        <div className="lg:col-span-6">
          <DailyQuestCard quest={quest} />
        </div>
        <div className="space-y-6 lg:col-span-3">
          <AttendanceCard initial={attendance} />
          <WeeklyQuestCard weekly={weekly} />
          <StreakCard current={status.player.currentStreak} longest={status.player.longestStreak} />
        </div>
      </div>

      <PartyActivityPreview activity={activity} hasParty={!!party} />

      <LevelUpReveal newLevelUp={status.newLevelUp} />
    </div>
  );
}
