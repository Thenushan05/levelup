import Link from "next/link";
import { Ghost } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <SystemPanel className="flex flex-col items-center gap-3 py-10">
        <Ghost className="h-8 w-8 text-glow-cyan" />
        <p className="label-system-accent tracking-[0.3em]">SYSTEM ERROR</p>
        <p className="heading-system text-xl">SECTOR NOT FOUND</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This part of the system doesn&apos;t exist, or has been moved.
        </p>
        <Link href="/dashboard" className={cn(buttonVariants(), "heading-system tracking-widest")}>
          RETURN TO DASHBOARD
        </Link>
      </SystemPanel>
    </div>
  );
}
