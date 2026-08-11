import { Flame, Dumbbell, Trophy } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { XpBar } from "@/components/system/hud-progress";
import { RankBadge } from "@/components/system/badges";
import type { PlayerStatusDTO } from "@/actions/player";

export function PlayerStatusCard({ status }: { status: PlayerStatusDTO }) {
  const { player } = status;
  return (
    <SystemPanel className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <SystemLabel accent>System Status</SystemLabel>
          <p className="heading-system mt-1 text-lg">{player.name.toUpperCase()}</p>
        </div>
        <RankBadge rank={player.rank} size="lg" />
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-heading text-3xl text-glow-cyan">LV.{player.level}</span>
          <span className="label-system">RANK {player.rank}</span>
        </div>
        <XpBar xp={player.xp} requiredXp={player.requiredXp} />
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4 text-center">
        <div>
          <Flame className="mx-auto mb-1 h-4 w-4 text-glow-cyan" />
          <p className="heading-system text-lg">{player.currentStreak}</p>
          <SystemLabel>Streak</SystemLabel>
        </div>
        <div>
          <Dumbbell className="mx-auto mb-1 h-4 w-4 text-glow-cyan" />
          <p className="heading-system text-lg">{player.totalWorkouts}</p>
          <SystemLabel>Quests</SystemLabel>
        </div>
        <div>
          <Trophy className="mx-auto mb-1 h-4 w-4 text-glow-cyan" />
          <p className="heading-system text-lg">{player.longestStreak}</p>
          <SystemLabel>Best</SystemLabel>
        </div>
      </div>
    </SystemPanel>
  );
}
