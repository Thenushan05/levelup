import { Flame } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";

export function StreakCard({ current, longest }: { current: number; longest: number }) {
  return (
    <SystemPanel className="flex items-center justify-between">
      <div>
        <SystemLabel accent>Consistency</SystemLabel>
        <p className="heading-system mt-1 flex items-center gap-2 text-2xl">
          <Flame className="h-5 w-5 text-glow-cyan" /> {current} DAYS
        </p>
      </div>
      <div className="text-right">
        <SystemLabel>Best</SystemLabel>
        <p className="heading-system text-lg text-muted-foreground">{longest}</p>
      </div>
    </SystemPanel>
  );
}
