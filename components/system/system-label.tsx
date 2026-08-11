import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SystemLabel({
  children,
  accent,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return <span className={cn(accent ? "label-system-accent" : "label-system", className)}>{children}</span>;
}

export function SystemHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn("heading-system font-heading text-xl sm:text-2xl", className)}>{children}</h1>;
}
