import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { getDietProfile } from "@/actions/diet";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { HudProgress } from "@/components/system/hud-progress";
import { EmptyState } from "@/components/system/empty-state";
import { BodyStatsForm } from "@/components/diet/body-stats-form";
import { BmiCategoryTable } from "@/components/diet/bmi-category-table";
import { formatDisplayDate } from "@/lib/dates";
import { BMI_CATEGORY_TONE, kgToLbs } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Diet & Body — LevelUp" };

const BMI_SCALE_MIN = 15;
const BMI_SCALE_MAX = 40;

export default async function DietPage() {
  const profile = await getDietProfile();

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>Diet &amp; Body</SystemLabel>
        <SystemHeading className="mt-1">Metabolic Readout</SystemHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Real formulas, not guesses — BMI, Mifflin-St Jeor BMR, and ACSM MET-based calorie burn.
        </p>
      </div>

      {!profile.hasBodyStats ? (
        <div className="space-y-4">
          <EmptyState
            title="BODY STATS NEEDED"
            description="Enter your weight, height, age, and sex to unlock BMI, calorie targets, and a real macro breakdown."
            icon={Info}
          />
          <SystemPanel className="space-y-4">
            <BodyStatsForm
              initial={{
                weightKg: profile.weightKg,
                heightCm: profile.heightCm,
                age: profile.age,
                biologicalSex: profile.biologicalSex,
                fitnessGoal: profile.fitnessGoal,
                unitSystem: profile.unitSystem,
              }}
            />
          </SystemPanel>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SystemPanel className="space-y-3">
              <SystemLabel accent>Body Mass Index</SystemLabel>
              <div className="flex items-baseline justify-between">
                <span className="font-heading text-3xl">{profile.bmi!.bmi}</span>
                <span className={cn("heading-system text-sm", BMI_CATEGORY_TONE[profile.bmi!.category])}>
                  {profile.bmi!.categoryLabel.toUpperCase()}
                </span>
              </div>
              <HudProgress
                percentage={((profile.bmi!.bmi - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100}
              />
              <BmiCategoryTable bmi={profile.bmi} />
            </SystemPanel>

            {profile.dietPlan && (
              <SystemPanel variant="violet" className="space-y-3">
                <SystemLabel accent>Energy Expenditure</SystemLabel>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">BMR (resting)</p>
                    <p className="heading-system text-lg">{profile.dietPlan.bmr.toLocaleString()} kcal</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">TDEE (total daily)</p>
                    <p className="heading-system text-lg">{profile.dietPlan.tdee.toLocaleString()} kcal</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Activity level: {profile.dietPlan.activityLevel.label} — derived from your actual training frequency, not self-reported.
                </p>
              </SystemPanel>
            )}
          </div>

          {profile.dietPlan && (
            <SystemPanel variant="success" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SystemLabel accent>Daily Diet Target — {profile.dietPlan.goalLabel}</SystemLabel>
                <span className="font-heading text-2xl text-glow-cyan">
                  {profile.dietPlan.calorieTarget.toLocaleString()} kcal/day
                </span>
              </div>
              {profile.dietPlan.cappedBySafetyFloor && (
                <p className="text-xs text-amber-400">
                  Your goal&apos;s raw math fell below a safe minimum, so the target was floored at a public-health
                  safety level instead.
                </p>
              )}

              <div className="space-y-3">
                <MacroRow label="Protein" grams={profile.dietPlan.macros.proteinG} kcal={profile.dietPlan.macros.proteinKcal} total={profile.dietPlan.calorieTarget} />
                <MacroRow label="Carbs" grams={profile.dietPlan.macros.carbsG} kcal={profile.dietPlan.macros.carbsKcal} total={profile.dietPlan.calorieTarget} />
                <MacroRow label="Fat" grams={profile.dietPlan.macros.fatG} kcal={profile.dietPlan.macros.fatKcal} total={profile.dietPlan.calorieTarget} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Protein set at 1.8 g/kg bodyweight (ISSN-supported range for training adults is 1.6–2.2 g/kg); fat at
                25% of total calories; carbs fill the remainder.
              </p>
            </SystemPanel>
          )}

          <SystemPanel className="space-y-3">
            <SystemLabel accent>Food Guidance</SystemLabel>
            <p className="text-xs text-muted-foreground">
              General categories to build meals from — not a prescribed menu.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <FoodList title="Protein" items={profile.foodGuidance.protein} />
              <FoodList title="Carbs" items={profile.foodGuidance.carbs} />
              <FoodList title="Fats" items={profile.foodGuidance.fats} />
            </div>
          </SystemPanel>

          <SystemPanel className="space-y-3">
            <SystemLabel accent>Calorie Burn</SystemLabel>

            {profile.todayEstimate && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Today — {profile.todayEstimate.workoutName}</p>
                <p className="heading-system text-lg text-glow-cyan">
                  {profile.todayEstimate.phase === "projected" ? "~" : ""}
                  {profile.todayEstimate.kcal} kcal
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {profile.todayEstimate.phase === "in_progress" &&
                    `Burned so far — ${profile.todayEstimate.minutes} min of real elapsed time since you started, still climbing as you log sets.`}
                  {profile.todayEstimate.phase === "projected" &&
                    `Projected from ${profile.todayEstimate.minutes} min at ${profile.todayEstimate.met} MET — you haven't started this yet.`}
                  {profile.todayEstimate.phase === "completed" &&
                    `Final total — ${profile.todayEstimate.minutes} min actual session duration.`}
                </p>
              </div>
            )}

            {profile.recentBurn.length > 0 ? (
              <div className="space-y-2">
                {profile.recentBurn.map((row) => (
                  <div key={row.date} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm">{row.workoutName}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDisplayDate(row.date)} · {row.minutes} min (actual)</p>
                    </div>
                    <span className="heading-system text-glow-cyan">{row.kcal} kcal</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete a workout to see real calorie burn here, calculated from your logged session duration.
              </p>
            )}

            {profile.lightActivityRange && (
              <p className="text-[11px] text-muted-foreground">
                Light-activity days (walking/cycling/mobility) burn roughly {profile.lightActivityRange.low}–
                {profile.lightActivityRange.high} kcal for 20–45 minutes at your weight — no set structure to estimate from precisely.
              </p>
            )}
          </SystemPanel>

          <SystemPanel noMotion className="space-y-2 text-xs text-muted-foreground">
            <p>
              Weight on file: {profile.unitSystem === "metric" ? `${profile.weightKg} kg` : `${Math.round(kgToLbs(profile.weightKg!))} lbs`} ·{" "}
              <Link href="/settings" className="text-glow-cyan underline">
                Edit in Settings
              </Link>
            </p>
            <p>
              These are general estimates from standard published formulas (Mifflin-St Jeor BMR, ACSM MET-based
              calorie equations, ISSN protein guidance) — not personalized medical or clinical advice. Consult a
              doctor or registered dietitian for medical conditions, pregnancy, or eating disorders.
            </p>
          </SystemPanel>
        </>
      )}
    </div>
  );
}

function MacroRow({ label, grams, kcal, total }: { label: string; grams: number; kcal: number; total: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {grams}g · {kcal} kcal
        </span>
      </div>
      <HudProgress percentage={total > 0 ? (kcal / total) * 100 : 0} />
    </div>
  );
}

function FoodList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="label-system mb-1.5">{title}</p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}
