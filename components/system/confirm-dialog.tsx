"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ShieldQuestion } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Themed stand-in for window.confirm() — native browser dialogs can't be styled at all. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "CONFIRM",
  cancelLabel = "CANCEL",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = variant === "destructive";

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "system-panel max-w-sm overflow-hidden text-center",
          isDanger ? "system-panel-danger" : "system-panel-violet"
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="flex flex-col items-center gap-4 py-2"
        >
          <motion.div
            initial={{ rotate: -15, scale: 0.6 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
          >
            {isDanger ? (
              <ShieldAlert
                className="h-9 w-9 text-destructive"
                style={{ filter: "drop-shadow(0 0 10px oklch(0.62 0.22 25 / 60%))" }}
              />
            ) : (
              <ShieldQuestion className="h-9 w-9 text-glow-violet" />
            )}
          </motion.div>

          <p className={cn("label-system-accent tracking-[0.35em]", isDanger && "text-destructive")}>
            {isDanger ? "SYSTEM WARNING" : "SYSTEM QUERY"}
          </p>
          <p className="heading-system text-lg">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="mt-2 flex w-full gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              {cancelLabel}
            </Button>
            <Button variant={isDanger ? "destructive" : "default"} onClick={onConfirm} className="flex-1">
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
