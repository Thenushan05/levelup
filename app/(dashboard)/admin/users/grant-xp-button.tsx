"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { grantManualXp } from "@/actions/admin-users";
import { showErrorToast, showSystemToast } from "@/lib/toast-system";

export function GrantXpButton({
  id,
  name,
  level,
  xp,
  requiredXp,
}: {
  id: string;
  name: string;
  level: number;
  xp: number;
  /** requiredXpForLevel(level), computed server-side — lib/xp.ts pulls in mongoose/mongodb and
   * must never be imported from a client component (it'd drag Node-only built-ins into the
   * browser bundle and break the build). */
  requiredXp: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("50");
  const [reason, setReason] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    startTransition(async () => {
      const result = await grantManualXp(id, parsed, reason);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      showSystemToast(
        `Granted ${parsed} XP`,
        result.leveledUp ? `${name} leveled up to LV.${result.toLevel}!` : `${name}'s XP was updated.`
      );
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label={`Give XP to ${name}`}>
        <Zap className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="system-panel system-panel-violet max-w-sm">
          <DialogHeader>
            <DialogTitle className="heading-system">Give XP — {name}</DialogTitle>
            <DialogDescription>
              LV.{level} · {xp}/{requiredXp} XP. This applies immediately — no approval queue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="xp-amount">Amount</Label>
              <Input
                id="xp-amount"
                type="number"
                min={1}
                step={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xp-reason">Reason (optional)</Label>
              <Input
                id="xp-reason"
                type="text"
                placeholder="Manual Admin Grant"
                maxLength={120}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                <Zap className="h-4 w-4" /> Give XP
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
