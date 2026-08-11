"use client";

import { useState } from "react";
import { PlayerStatusCard } from "@/components/dashboard/player-status-card";
import { DailyQuestCard } from "@/components/dashboard/daily-quest-card";
import { WeeklyQuestCard } from "@/components/dashboard/weekly-quest-card";
import { StreakCard } from "@/components/dashboard/streak-card";
import { AttendanceCard } from "@/components/dashboard/attendance-card";
import { PartyActivityPreview } from "@/components/dashboard/party-activity-preview";
import { LevelUpModal } from "@/components/system/level-up-modal";
import type { PlayerStatusDTO } from "@/actions/player";
import type { AttendanceStatusDTO } from "@/actions/attendance";
import type { WeeklyQuestStatusDTO } from "@/actions/progress";
import type { PartySummaryDTO, PartyActivityDTO } from "@/actions/party";
import type { DailyWorkoutDTO, LevelUpResult } from "@/types";

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
  const [levelUp, setLevelUp] = useState<LevelUpResult | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <PlayerStatusCard status={status} />
        </div>
        <div className="lg:col-span-6">
          <DailyQuestCard quest={quest} />
        </div>
        <div className="space-y-6 lg:col-span-3">
          <AttendanceCard initial={attendance} onLevelUp={setLevelUp} />
          <WeeklyQuestCard weekly={weekly} />
          <StreakCard current={status.player.currentStreak} longest={status.player.longestStreak} />
        </div>
      </div>

      <PartyActivityPreview activity={activity} hasParty={!!party} />

      <LevelUpModal levelUp={levelUp} onClose={() => setLevelUp(null)} />
    </div>
  );
}
