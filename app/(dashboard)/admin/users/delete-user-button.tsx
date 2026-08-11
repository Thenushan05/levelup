"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/system/confirm-dialog";
import { deleteUserAccount } from "@/actions/admin-users";
import { showErrorToast, showSystemToast } from "@/lib/toast-system";

export function DeleteUserButton({ id, name, email }: { id: string; name: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await deleteUserAccount(id);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSystemToast("User deleted", `${name}'s account and all associated data were removed.`);
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
        description={`This permanently deletes ${email}'s account and every record tied to it — attendance, workouts, achievements, pending XP, notifications, and party membership. This can't be undone.`}
        confirmLabel="DELETE USER"
        cancelLabel="CANCEL"
        variant="destructive"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
