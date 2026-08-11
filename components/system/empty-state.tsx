import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SystemPanel } from "@/components/system/system-panel";

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <SystemPanel className="flex flex-col items-center gap-3 py-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />}
      <p className="heading-system text-sm text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </SystemPanel>
  );
}
