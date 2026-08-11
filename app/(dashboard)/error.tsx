"use client";

import { useEffect } from "react";
import { SystemErrorState } from "@/components/system/error-state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <SystemErrorState
        message="Unable to load this section of the system. Try again."
        onRetry={reset}
      />
    </div>
  );
}
