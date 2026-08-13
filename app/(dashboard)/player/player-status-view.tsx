import { RankBadge } from "@/components/system/badges";
import { getRankTitle } from "@/lib/ranks";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { XpBar } from "@/components/system/hud-progress";
import { StatBar } from "@/components/progress/stat-bar";
import { LevelUpReveal } from "@/components/system/level-up-reveal";
import type { PlayerStatusDTO } from "@/actions/player";

export function PlayerStatusView({ status }: { status: PlayerStatusDTO }) {
  const { player, stats, nextRank, levelsToNextRank, pendingXp } = status;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SystemPanel className="flex flex-col items-center gap-3 py-8 text-center">
        <SystemLabel accent>Player</SystemLabel>
        <SystemHeading className="text-2xl">{player.name}</SystemHeading>
        <RankBadge rank={player.rank} size="lg" />
        <p className="heading-system text-3xl text-glow-cyan">LEVEL {player.level}</p>
        <p className="label-system-accent">{getRankTitle(player.rank)}</p>
        <p className="label-system">
          RANK {player.rank}
          {nextRank ? ` · ${levelsToNextRank} LEVELS TO ${nextRank} RANK` : " · MAX RANK"}
        </p>
        <div className="w-full max-w-xs">
          <XpBar xp={player.xp} requiredXp={player.requiredXp} />
        </div>
        {pendingXp > 0 && (
          <p className="text-xs text-muted-foreground">
            +{pendingXp} XP <span className="text-glow-violet">pending admin approval</span>
          </p>
        )}
      </SystemPanel>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total Workouts" value={player.totalWorkouts} />
        <StatTile label="Current Streak" value={`${player.currentStreak}D`} />
        <StatTile label="Longest Streak" value={`${player.longestStreak}D`} />
        <StatTile label="Attendance" value={`${stats.attendance}%`} />
      </div>

      <SystemPanel className="space-y-4">
        <SystemLabel accent>Training Stats</SystemLabel>
        <StatBar label="Consistency" value={stats.consistency} />
        <StatBar label="Workout Completion" value={stats.workoutCompletion} />
        <StatBar label="Attendance" value={stats.attendance} />
      </SystemPanel>

      <LevelUpReveal newLevelUp={status.newLevelUp} />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <SystemPanel noMotion className="text-center">
      <SystemLabel>{label}</SystemLabel>
      <p className="heading-system mt-1 text-xl text-glow-cyan">{value}</p>
    </SystemPanel>
  );
}
