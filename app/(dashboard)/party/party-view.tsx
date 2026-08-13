"use client";

import { useState, useTransition } from "react";
import { Copy, Crown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { XpBar } from "@/components/system/hud-progress";
import { RankBadge } from "@/components/system/badges";
import { Button } from "@/components/ui/button";
import { reactToActivity } from "@/actions/party";
import { showErrorToast, showSystemToast } from "@/lib/toast-system";
import { getRankTitle } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import type { Rank } from "@/types";
import type {
  PartySummaryDTO,
  PartyMemberDTO,
  PartyActivityDTO,
  LeaderboardRowDTO,
  LevelLeaderboardRowDTO,
} from "@/actions/party";

const REACTIONS = ["🔥", "💪", "👏"] as const;

const STATUS_LABEL: Record<PartyMemberDTO["todayStatus"], string> = {
  complete: "QUEST COMPLETE ✓",
  in_progress: "QUEST IN PROGRESS",
  not_started: "NOT STARTED",
  rest: "RECOVERY",
  optional: "OPTIONAL",
  no_plan: "NO ROUTINE",
};

export function PartyView({
  party,
  members,
  activity,
  leaderboard,
  levelLeaderboard,
}: {
  party: PartySummaryDTO;
  members: PartyMemberDTO[];
  activity: PartyActivityDTO[];
  leaderboard: LeaderboardRowDTO[];
  levelLeaderboard: LevelLeaderboardRowDTO[];
}) {
  const [items, setItems] = useState(activity);
  const [, startTransition] = useTransition();

  function handleReact(notificationId: string, emoji: (typeof REACTIONS)[number]) {
    setItems((prev) =>
      prev.map((a) => {
        if (a.id !== notificationId) return a;
        const existing = a.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          const updated = a.reactions
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: existing.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !existing.reactedByMe }
                : r
            )
            .filter((r) => r.count > 0);
          return { ...a, reactions: updated };
        }
        return { ...a, reactions: [...a.reactions, { emoji, count: 1, reactedByMe: true }] };
      })
    );
    startTransition(async () => {
      try {
        await reactToActivity({ notificationId, emoji });
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : "Unable to react.");
      }
    });
  }

  function copyInvite() {
    navigator.clipboard
      .writeText(party.inviteCode)
      .then(() => showSystemToast("Invite code copied"))
      .catch(() => {});
  }

  return (
    <div className="space-y-6">
      <SystemPanel className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SystemLabel accent>Party</SystemLabel>
          <SystemHeading className="mt-1">{party.name}</SystemHeading>
          <p className="text-xs text-muted-foreground">{party.memberCount} MEMBERS</p>
        </div>
        <Button variant="outline" onClick={copyInvite} className="heading-system tracking-widest">
          <Copy className="h-4 w-4" /> {party.inviteCode}
        </Button>
      </SystemPanel>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">MEMBERS</TabsTrigger>
          <TabsTrigger value="levels">LEVELS</TabsTrigger>
          <TabsTrigger value="activity">ACTIVITY</TabsTrigger>
          <TabsTrigger value="leaderboard">WEEKLY</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-2.5 pt-4">
          {members.map((m) => (
            <SystemPanel key={m.userId} noMotion className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 text-xs font-bold text-glow-cyan">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="heading-system text-sm">{m.name}</p>
                  <SystemLabel>
                    LEVEL {m.level} · {m.rank} RANK · {getRankTitle(m.rank as Rank).toUpperCase()}
                  </SystemLabel>
                </div>
              </div>
              <span className={cn("label-system shrink-0", m.todayStatus === "complete" && "text-success")}>
                {STATUS_LABEL[m.todayStatus]}
              </span>
            </SystemPanel>
          ))}
        </TabsContent>

        <TabsContent value="levels" className="space-y-2.5 pt-4">
          {levelLeaderboard.map((row, i) => (
            <SystemPanel
              key={row.userId}
              noMotion
              variant={row.isMe ? "violet" : "cyan"}
              className="flex items-center gap-3"
            >
              <span className="heading-system w-5 shrink-0 text-center text-sm text-muted-foreground">
                {i + 1}
              </span>
              {i === 0 && <Crown className="h-4 w-4 shrink-0 text-rank" />}
              <RankBadge rank={row.rank} size="sm" />
              <div className="min-w-0 flex-1">
                <p className={cn("heading-system truncate text-sm", row.isMe && "text-glow-violet")}>
                  {row.name}
                  {row.isMe && <span className="ml-1.5 text-xs text-muted-foreground">(YOU)</span>}
                </p>
                <SystemLabel>{getRankTitle(row.rank)}</SystemLabel>
                <XpBar xp={row.xp} requiredXp={row.requiredXp} />
              </div>
              <span className="label-system-accent shrink-0">LV.{row.level}</span>
            </SystemPanel>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-2.5 pt-4">
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No activity yet. Get training!</p>
          ) : (
            items.map((a) => (
              <SystemPanel key={a.id} noMotion className="space-y-2">
                <p className="text-sm">
                  <span className="heading-system">{a.title}</span>
                  {a.message && <span className="text-muted-foreground"> — {a.message}</span>}
                </p>
                <div className="flex items-center gap-1.5">
                  {REACTIONS.map((emoji) => {
                    const r = a.reactions.find((x) => x.emoji === emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReact(a.id, emoji)}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                          r?.reactedByMe
                            ? "border-primary bg-primary/10"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {emoji} {r?.count ?? ""}
                      </button>
                    );
                  })}
                </div>
              </SystemPanel>
            ))
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-2 pt-4">
          {leaderboard.map((row, i) => (
            <SystemPanel key={row.userId} noMotion className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="heading-system w-5 text-center text-sm text-muted-foreground">{i + 1}</span>
                {i === 0 && row.completed > 0 && <Crown className="h-4 w-4 text-rank" />}
                <p className="heading-system text-sm">{row.name}</p>
              </div>
              <span className="label-system-accent">
                {row.completed} / {row.required}
              </span>
            </SystemPanel>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
