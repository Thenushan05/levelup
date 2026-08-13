"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Small "View" trigger that opens the exercise's reference image in a modal instead of rendering it inline. */
export function ExerciseImageButton({ imageUrl, name }: { imageUrl: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={(e) => {
          // Rows this sits in are often wrapped in a Link (Exercise Library) —
          // stop the click from also triggering navigation.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <ImageIcon />
        View
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogTitle>{name}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- local /public asset, no remote-image config needed */}
          <img
            src={imageUrl}
            alt={name}
            className="max-h-[75vh] w-full rounded-lg border border-border object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
