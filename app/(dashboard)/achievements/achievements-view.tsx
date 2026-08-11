import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { cn } from "@/lib/utils";
import type { AchievementsPageDTO } from "@/actions/achievements";

function getIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Award;
}

export function AchievementsView({ data }: { data: AchievementsPageDTO }) {
  const pct = data.total > 0 ? (data.unlockedCount / data.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <SystemPanel className="space-y-3 text-center">
        <SystemLabel accent>Achievements</SystemLabel>
        <SystemHeading className="text-2xl">
          {data.unlockedCount} / {data.total}
        </SystemHeading>
        <div className="mx-auto max-w-xs">
          <HudProgress percentage={pct} />
        </div>
      </SystemPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.achievements.map((a) => {
          const Icon = getIcon(a.icon);
          return (
            <SystemPanel
              key={a.key}
              noMotion
              variant={a.unlocked ? "success" : "cyan"}
              className={cn("space-y-2", !a.unlocked && "opacity-60")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                    a.unlocked
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="heading-system truncate text-sm">{a.unlocked ? a.title : "???"}</p>
                  <SystemLabel>{a.unlocked ? `UNLOCKED · +${a.xpReward} XP` : `+${a.xpReward} XP`}</SystemLabel>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{a.description}</p>
            </SystemPanel>
          );
        })}
      </div>
    </div>
  );
}
