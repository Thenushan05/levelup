"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { EmptyState } from "@/components/system/empty-state";
import { formatDisplayDate } from "@/lib/dates";
import type { ExerciseProgressDTO } from "@/actions/progress";

export function ExerciseProgressView({ progress }: { progress: ExerciseProgressDTO }) {
  const chartData = progress.history.map((h) => ({
    date: formatDisplayDate(h.date),
    weight: h.weight,
    reps: h.reps,
  }));

  return (
    <div className="space-y-6">
      <div>
        <SystemLabel accent>{progress.muscleGroup}</SystemLabel>
        <SystemHeading className="mt-1">{progress.name}</SystemHeading>
        <p className="label-system mt-1">Training Record</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SystemPanel className="text-center">
          <SystemLabel>Sessions</SystemLabel>
          <p className="heading-system mt-1 text-2xl text-glow-cyan">{progress.sessions}</p>
        </SystemPanel>
        <SystemPanel className="text-center">
          <SystemLabel>Best Recorded Weight</SystemLabel>
          <p className="heading-system mt-1 text-2xl text-glow-cyan">
            {progress.bestWeight != null ? `${progress.bestWeight} KG` : "—"}
          </p>
        </SystemPanel>
        <SystemPanel className="text-center">
          <SystemLabel>Last Session</SystemLabel>
          <p className="heading-system mt-1 text-2xl text-glow-cyan">
            {progress.lastSession ? `${progress.lastSession.weight ?? 0} KG × ${progress.lastSession.reps ?? 0}` : "—"}
          </p>
        </SystemPanel>
      </div>

      {chartData.length > 1 ? (
        <SystemPanel className="space-y-3">
          <SystemLabel accent>Weight Progress</SystemLabel>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value, key) => [
                    key === "weight" ? `${value} KG` : String(value),
                    key === "weight" ? "Weight" : "Reps",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SystemPanel>
      ) : (
        <EmptyState
          title="NOT ENOUGH DATA YET"
          description="Complete more sessions with this exercise to see your progress chart."
          icon={LineChartIcon}
        />
      )}

      <p className="text-center text-xs text-muted-foreground">Continue when comfortable with good technique.</p>
    </div>
  );
}
