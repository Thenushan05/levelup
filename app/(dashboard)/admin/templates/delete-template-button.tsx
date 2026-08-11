"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/system/confirm-dialog";
import { deleteTemplate } from "@/actions/admin";
import { showErrorToast, showSystemToast } from "@/lib/toast-system";

export function DeleteTemplateButton({
  id,
  name,
  usageCount,
}: {
  id: string;
  name: string;
  usageCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      try {
        await deleteTemplate(id);
        showSystemToast("Template deleted");
        router.refresh();
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : "Unable to delete template.");
      }
    });
  }

  const description =
    usageCount > 0
      ? `${usageCount} player${usageCount === 1 ? " is" : "s are"} currently using "${name}" and will need to pick a new routine. This can't be undone.`
      : `Delete "${name}"? This can't be undone.`;

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
        description={description}
        confirmLabel="DELETE TEMPLATE"
        cancelLabel="CANCEL"
        variant="destructive"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
