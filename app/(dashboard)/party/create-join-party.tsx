"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createGroup, joinGroup } from "@/actions/party";

export function CreateJoinParty() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    startTransition(async () => {
      const result = await createGroup({ name });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const inviteCode = String(new FormData(e.currentTarget).get("inviteCode") ?? "");
    startTransition(async () => {
      const result = await joinGroup({ inviteCode });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <Users className="mx-auto mb-2 h-8 w-8 text-glow-cyan" />
        <SystemLabel accent>Party System</SystemLabel>
        <SystemHeading className="mt-1">Form Your Gym Party</SystemHeading>
        <p className="mt-1 text-sm text-muted-foreground">Train alongside friends and track each other&apos;s progress.</p>
      </div>

      <SystemPanel className="space-y-3">
        <SystemLabel accent>Create Party</SystemLabel>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="label-system">
              Party Name
            </Label>
            <Input id="name" name="name" required placeholder="Gym Bros" maxLength={40} />
          </div>
          <Button type="submit" disabled={pending} className="w-full heading-system tracking-widest">
            {pending ? "CREATING..." : "CREATE PARTY"}
          </Button>
        </form>
      </SystemPanel>

      <SystemPanel className="space-y-3">
        <SystemLabel accent>Join Party</SystemLabel>
        <form onSubmit={handleJoin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inviteCode" className="label-system">
              Invite Code
            </Label>
            <Input id="inviteCode" name="inviteCode" required placeholder="ABC123" className="uppercase" maxLength={12} />
          </div>
          <Button type="submit" variant="outline" disabled={pending} className="w-full heading-system tracking-widest">
            {pending ? "JOINING..." : "JOIN PARTY"}
          </Button>
        </form>
      </SystemPanel>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
