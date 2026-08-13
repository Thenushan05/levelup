import Link from "next/link";
import { Flame, Dumbbell, Trophy, Scale } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { XpBar } from "@/components/system/hud-progress";
import { RankBadge } from "@/components/system/badges";
import { getRankTitle } from "@/lib/ranks";
import { BMI_CATEGORY_TONE } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { PlayerStatusDTO } from "@/actions/player";

export function PlayerStatusCard({ status }: { status: PlayerStatusDTO }) {
  const { player, pendingXp, bmi } = status;
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
          <span className="label-system text-right">
            RANK {player.rank}
            <br />
            {getRankTitle(player.rank)}
          </span>
        </div>
        <XpBar xp={player.xp} requiredXp={player.requiredXp} />
        {pendingXp > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            +{pendingXp} XP <span className="text-glow-violet">pending admin approval</span>
          </p>
        )}
      </div>

      <div className={cn("grid gap-3 border-t border-border/60 pt-4 text-center", bmi ? "grid-cols-4" : "grid-cols-3")}>
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
        {bmi && (
          <Link href="/diet">
            <Scale className={cn("mx-auto mb-1 h-4 w-4", BMI_CATEGORY_TONE[bmi.category])} />
            <p className={cn("heading-system text-lg", BMI_CATEGORY_TONE[bmi.category])}>{bmi.bmi}</p>
            <SystemLabel>BMI</SystemLabel>
          </Link>
        )}
      </div>
    </SystemPanel>
  );
}
