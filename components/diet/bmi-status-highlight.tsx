import { BMI_CATEGORY_QUOTE, BMI_CATEGORY_TONE, type BmiResult } from "@/lib/nutrition";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { cn } from "@/lib/utils";

const PANEL_VARIANT: Record<BmiResult["category"], "cyan" | "violet" | "success"> = {
  underweight: "violet",
  normal: "success",
  overweight: "cyan",
  obese: "cyan",
};

/**
 * Dashboard-only BMI readout — shows just the player's current condition
 * (not the full WHO table; that lives on the Diet & Body page), highlighted
 * in its category color with a Solo Leveling–style "System" quote so it
 * reads as a status window arising, not a clinical verdict.
 */
export function BmiStatusHighlight({ bmi }: { bmi: BmiResult }) {
  const tone = BMI_CATEGORY_TONE[bmi.category];
  return (
    <SystemPanel
      variant={PANEL_VARIANT[bmi.category]}
      className={cn("space-y-2", bmi.category === "obese" && "system-panel-danger")}
    >
      <div className="flex items-baseline justify-between">
        <SystemLabel accent>Body Mass Index</SystemLabel>
        <span className={cn("font-heading text-3xl", tone)}>{bmi.bmi}</span>
      </div>
      <p className={cn("heading-system text-lg", tone)}>{bmi.categoryLabel}</p>
      <p className={cn("text-xs italic", tone)}>&ldquo;{BMI_CATEGORY_QUOTE[bmi.category]}&rdquo;</p>
    </SystemPanel>
  );
}
