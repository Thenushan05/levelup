"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Inbox } from "lucide-react";
import { EmptyState } from "@/components/system/empty-state";
import { Button } from "@/components/ui/button";
import { approveAllPending, type PendingApprovalDTO } from "@/actions/approvals";
import { showErrorToast, showSystemToast } from "@/lib/toast-system";
import { ApprovalRow } from "./approval-row";

export function ApprovalsView({ initial }: { initial: PendingApprovalDTO[] }) {
  const [items, setItems] = useState(initial);
  const [bulkPending, startBulkTransition] = useTransition();

  function handleResolved(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleApproveAll() {
    startBulkTransition(async () => {
      try {
        const { approved } = await approveAllPending();
        setItems([]);
        showSystemToast(`Approved ${approved} XP award${approved === 1 ? "" : "s"}`);
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : "Unable to approve all.");
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState title="ALL CAUGHT UP" description="No XP awards are waiting for review right now." icon={Inbox} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} awaiting review</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApproveAll}
          disabled={bulkPending}
          className="heading-system tracking-wide"
        >
          <CheckCheck className="h-4 w-4" /> APPROVE ALL
        </Button>
      </div>
      <div className="space-y-2.5">
        {items.map((a) => (
          <ApprovalRow key={a.id} approval={a} onResolved={handleResolved} />
        ))}
      </div>
    </div>
  );
}
