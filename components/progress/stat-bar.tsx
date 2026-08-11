import { HudProgress } from "@/components/system/hud-progress";
import { SystemLabel } from "@/components/system/system-label";

export function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <SystemLabel>{label}</SystemLabel>
        <span className="heading-system text-xs text-glow-cyan">{value}</span>
      </div>
      <HudProgress percentage={value} />
    </div>
  );
}
