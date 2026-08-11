"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SystemPanel } from "@/components/system/system-panel";

export function SystemErrorState({
  message = "Unable to save your progress. Check your connection and try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <SystemPanel className="flex flex-col items-center gap-3 border-destructive/40 py-8 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="label-system-accent text-destructive">SYSTEM ERROR</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="heading-system tracking-widest">
          RETRY
        </Button>
      )}
    </SystemPanel>
  );
}
