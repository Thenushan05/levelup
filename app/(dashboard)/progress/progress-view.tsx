"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { CalendarGrid } from "@/components/progress/calendar-grid";
import { StatBar } from "@/components/progress/stat-bar";
import type { WeeklyCompletionPointDTO } from "@/actions/progress";
import type { CalendarDayDTO } from "@/actions/history";
import type { PlayerStatsDTO } from "@/actions/player";

export function ProgressView({
  weekly,
  calendar,
  monthLabel,
  stats,
}: {
  weekly: WeeklyCompletionPointDTO[];
  calendar: CalendarDayDTO[];
  monthLabel: string;
  stats: PlayerStatsDTO;
}) {
  const chartData = weekly.map((w, i) => ({
    label: `W${i + 1}`,
    percentage: w.required > 0 ? Math.round((w.completed / w.required) * 100) : 0,
    completed: w.completed,
    required: w.required,
  }));

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>Progress</SystemLabel>
        <SystemHeading className="mt-1">Training Record</SystemHeading>
      </div>

      <SystemPanel className="space-y-4">
        <SystemLabel accent>Training Stats</SystemLabel>
        <div className="space-y-4">
          <StatBar label="Consistency" value={stats.consistency} />
          <StatBar label="Workout Completion" value={stats.workoutCompletion} />
          <StatBar label="Attendance" value={stats.attendance} />
        </div>
      </SystemPanel>

      <SystemPanel className="space-y-3">
        <SystemLabel accent>Weekly Objective Completion</SystemLabel>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(_value, _key, item) => {
                  const payload = item.payload as { completed: number; required: number };
                  return [`${payload.completed} / ${payload.required}`, "Completed"];
                }}
              />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]} fill="var(--primary)" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SystemPanel>

      <SystemPanel className="space-y-3">
        <div className="flex items-center justify-between">
          <SystemLabel accent>Quest Calendar</SystemLabel>
          <SystemLabel>{monthLabel}</SystemLabel>
        </div>
        <CalendarGrid days={calendar} />
      </SystemPanel>
    </div>
  );
}
