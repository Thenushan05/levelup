"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Crown, Megaphone, Check, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { XpBar } from "@/components/system/hud-progress";
import { RankBadge } from "@/components/system/badges";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/system/confirm-dialog";
import { reactToActivity, addActivityComment, nudgeMember, deleteParty } from "@/actions/party";
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
  const router = useRouter();
  const [items, setItems] = useState(activity);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();
  const nextOptimisticId = useRef(0);

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

  function handleAddComment(notificationId: string) {
    const text = (commentDrafts[notificationId] ?? "").trim();
    if (!text) return;

    setCommentDrafts((prev) => ({ ...prev, [notificationId]: "" }));
    const optimisticId = `pending-${nextOptimisticId.current++}`;
    setItems((prev) =>
      prev.map((a) =>
        a.id !== notificationId
          ? a
          : {
              ...a,
              comments: [...a.comments, { id: optimisticId, userName: "You", text, createdAt: new Date().toISOString() }],
            }
      )
    );

    startTransition(async () => {
      try {
        const created = await addActivityComment({ notificationId, text });
        setItems((prev) =>
          prev.map((a) =>
            a.id !== notificationId ? a : { ...a, comments: a.comments.map((c) => (c.id === optimisticId ? created : c)) }
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((a) => (a.id !== notificationId ? a : { ...a, comments: a.comments.filter((c) => c.id !== optimisticId) }))
        );
        showErrorToast(err instanceof Error ? err.message : "Unable to post comment.");
      }
    });
  }

  function handleNudge(memberUserId: string) {
    setNudgedIds((prev) => new Set(prev).add(memberUserId));
    startTransition(async () => {
      try {
        await nudgeMember({ memberUserId });
        showSystemToast("Cheer sent 🔥");
      } catch (err) {
        setNudgedIds((prev) => {
          const next = new Set(prev);
          next.delete(memberUserId);
          return next;
        });
        showErrorToast(err instanceof Error ? err.message : "Unable to send cheer.");
      }
    });
  }

  function copyInvite() {
    navigator.clipboard
      .writeText(party.inviteCode)
      .then(() => showSystemToast("Invite code copied"))
      .catch(() => {});
  }

  function handleDeleteParty() {
    setDeleteConfirmOpen(false);
    startTransition(async () => {
      try {
        await deleteParty(party.id);
        showSystemToast("Party deleted");
        router.refresh();
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : "Unable to delete party.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <SystemPanel className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SystemLabel accent>Party</SystemLabel>
          <SystemHeading className="mt-1">{party.name}</SystemHeading>
          <p className="text-xs text-muted-foreground">{party.memberCount} MEMBERS</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyInvite} className="heading-system tracking-widest">
            <Copy className="h-4 w-4" /> {party.inviteCode}
          </Button>
          {party.isOwner && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setDeleteConfirmOpen(true)}
              aria-label="Delete party"
              title="Only the party's creator can delete it"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SystemPanel>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete "${party.name}"?`}
        description={`This removes the party for all ${party.memberCount} member${party.memberCount === 1 ? "" : "s"} and clears its activity feed. This can't be undone.`}
        confirmLabel="DELETE PARTY"
        cancelLabel="CANCEL"
        variant="destructive"
        onConfirm={handleDeleteParty}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

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
                  <p className="heading-system flex items-center gap-1.5 text-sm">
                    {m.name}
                    {m.isMvp && (
                      <span title="MVP of the week — #1 on this week's leaderboard">
                        <Crown className="h-3.5 w-3.5 text-rank" />
                      </span>
                    )}
                  </p>
                  <SystemLabel>
                    LEVEL {m.level} · {m.rank} RANK · {getRankTitle(m.rank as Rank).toUpperCase()}
                  </SystemLabel>
                  <p className="text-[11px] text-muted-foreground">
                    {m.templateName ?? "No active routine"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn("label-system", m.todayStatus === "complete" && "text-success")}>
                  {STATUS_LABEL[m.todayStatus]}
                </span>
                {!m.isMe && m.todayStatus === "not_started" && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={nudgedIds.has(m.userId)}
                    onClick={() => handleNudge(m.userId)}
                    title="Send a cheer to nudge them toward today's quest"
                  >
                    {nudgedIds.has(m.userId) ? (
                      <>
                        <Check className="h-3 w-3" /> CHEERED
                      </>
                    ) : (
                      <>
                        <Megaphone className="h-3 w-3" /> CHEER
                      </>
                    )}
                  </Button>
                )}
              </div>
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

                {a.comments.length > 0 && (
                  <div className="space-y-1 border-t border-border/60 pt-2">
                    {a.comments.map((c) => (
                      <p key={c.id} className="text-xs">
                        <span className="heading-system text-muted-foreground">{c.userName}</span>{" "}
                        <span className="text-foreground">{c.text}</span>
                      </p>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddComment(a.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={commentDrafts[a.id] ?? ""}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    placeholder="Reply..."
                    maxLength={280}
                    className="h-7 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:border-primary"
                  />
                  <Button
                    type="submit"
                    size="xs"
                    variant="outline"
                    disabled={!(commentDrafts[a.id] ?? "").trim()}
                  >
                    Reply
                  </Button>
                </form>
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
