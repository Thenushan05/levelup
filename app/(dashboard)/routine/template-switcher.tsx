"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/system/confirm-dialog";
import { switchTemplate, type TemplateSummaryDTO } from "@/actions/onboarding";
import { showErrorToast, showSystemToast } from "@/lib/toast-system";
import { cn } from "@/lib/utils";

export function TemplateSwitcher({
  templates,
  activeSlug,
}: {
  templates: TemplateSummaryDTO[];
  activeSlug: string | null;
}) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ slug: string; name: string } | null>(null);
  const [, startTransition] = useTransition();

  function requestSwitch(slug: string, name: string) {
    if (slug === activeSlug || pendingSlug) return;
    setConfirmTarget({ slug, name });
  }

  function handleConfirm() {
    if (!confirmTarget) return;
    const { slug, name } = confirmTarget;
    setConfirmTarget(null);
    setPendingSlug(slug);

    startTransition(async () => {
      const result = await switchTemplate(slug);
      setPendingSlug(null);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      if (result.todayKeptProgress) {
        showSystemToast(
          "Routine Switched",
          `Now training ${name}. Today's in-progress quest was kept as-is — it'll switch over tomorrow.`
        );
      } else {
        showSystemToast("Routine Switched", `Now training ${name} — today's quest updated too.`);
      }
      router.refresh();
    });
  }

  return (
    <>
      <SystemPanel className="space-y-4">
        <div>
          <SystemLabel accent>Available Routines</SystemLabel>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch your active routine any time — built-in and admin-created templates all appear here.
          </p>
        </div>

        <div className="space-y-3">
          {templates.map((t) => {
            const isActive = t.slug === activeSlug;
            return (
              <div
                key={t.slug}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
                  isActive ? "border-primary/50 bg-primary/5" : "border-border"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="heading-system text-base text-glow-cyan">{t.name}</p>
                    {isActive && (
                      <span className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                        <Check className="h-3 w-3" /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.dayCount.workout} training days · {t.dayCount.rest} recovery · {t.dayCount.optional} optional
                  </p>
                </div>
                {!isActive && (
                  <Button
                    onClick={() => requestSwitch(t.slug, t.name)}
                    disabled={pendingSlug !== null}
                    className="shrink-0"
                  >
                    {pendingSlug === t.slug ? "SWITCHING..." : "ACTIVATE"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SystemPanel>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Confirm Routine Switch"
        description={
          confirmTarget
            ? `Switch your active routine to "${confirmTarget.name}"? If you haven't touched today's quest yet, it updates immediately. If you've already logged progress today, it stays as-is and the new routine takes over tomorrow.`
            : ""
        }
        confirmLabel="SWITCH ROUTINE"
        cancelLabel="CANCEL"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
