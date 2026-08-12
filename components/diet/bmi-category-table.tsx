import { BMI_CATEGORY_MOTIVATION, BMI_CATEGORY_ROWS, BMI_CATEGORY_TONE, type BmiResult } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

/**
 * WHO BMI category legend. Always renders the full table so the player can
 * see where they sit relative to every band, not just their own number —
 * the active row is highlighted and paired with a short encouragement so
 * the readout never feels like a bare verdict.
 */
export function BmiCategoryTable({ bmi, compact = false }: { bmi?: BmiResult | null; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="label-system px-3 py-2 text-left font-normal">BMI</th>
              <th className="label-system px-3 py-2 text-left font-normal">Category</th>
            </tr>
          </thead>
          <tbody>
            {BMI_CATEGORY_ROWS.map((row) => {
              const isActive = bmi?.category === row.category;
              const tone = BMI_CATEGORY_TONE[row.category];
              return (
                <tr
                  key={row.category}
                  className={cn(
                    "border-b border-border/60 last:border-b-0",
                    isActive && "bg-white/[0.04]",
                  )}
                >
                  <td className={cn("px-3 py-2", isActive && cn("heading-system", tone))}>{row.range}</td>
                  <td className={cn("px-3 py-2", isActive ? cn("heading-system", tone) : "text-muted-foreground")}>
                    <span className="flex items-center gap-2">
                      {row.label}
                      {isActive && <span className="label-system-accent text-[10px]">◄ YOU</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bmi && !compact && (
        <p className={cn("text-xs", BMI_CATEGORY_TONE[bmi.category])}>{BMI_CATEGORY_MOTIVATION[bmi.category]}</p>
      )}
    </div>
  );
}
