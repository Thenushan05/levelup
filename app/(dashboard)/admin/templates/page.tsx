import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Shield } from "lucide-react";
import { getAllTemplatesAdmin } from "@/actions/admin";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteTemplateButton } from "./delete-template-button";

export const metadata: Metadata = { title: "Admin — Templates — LevelUp" };

export default async function AdminTemplatesPage() {
  const templates = await getAllTemplatesAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SystemLabel accent>Admin</SystemLabel>
          <SystemHeading className="mt-1">Routine Templates</SystemHeading>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and manage any routine — day types, exercises, sets, and reps are fully editable.
          </p>
        </div>
        <Link href="/admin/templates/new" className={cn(buttonVariants(), "heading-system tracking-widest")}>
          <Plus className="h-4 w-4" /> NEW TEMPLATE
        </Link>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="NO TEMPLATES YET"
          description="Create your first routine template to make it available during onboarding."
          icon={Shield}
        />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <SystemPanel key={t.id} noMotion className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="heading-system text-base">{t.name}</p>
                  {t.isBuiltIn && <span className="label-system rounded border border-border px-1.5 py-0.5">BUILT-IN</span>}
                </div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.daysPerWeek} training days/week · {t.usageCount} player{t.usageCount === 1 ? "" : "s"} using it
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/templates/${t.id}/edit`}
                  className={cn(buttonVariants({ variant: "outline" }), "heading-system tracking-wide")}
                >
                  EDIT
                </Link>
                <DeleteTemplateButton id={t.id} name={t.name} usageCount={t.usageCount} />
              </div>
            </SystemPanel>
          ))}
        </div>
      )}
    </div>
  );
}
