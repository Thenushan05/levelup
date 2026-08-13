"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/system/confirm-dialog";
import { deletePartyAdmin } from "@/actions/admin-parties";
import { showErrorToast, showSystemToast } from "@/lib/toast-system";

export function DeletePartyButton({ id, name, memberCount }: { id: string; name: string; memberCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await deletePartyAdmin(id);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSystemToast("Party deleted", `"${name}" and its activity feed were removed.`);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        aria-label={`Delete ${name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${name}"?`}
        description={`This removes the party for all ${memberCount} member${memberCount === 1 ? "" : "s"} and clears its activity feed. This can't be undone.`}
        confirmLabel="DELETE PARTY"
        cancelLabel="CANCEL"
        variant="destructive"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
