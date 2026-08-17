// Shared enums / DTO shapes used across models, server actions, and UI.
// Server actions always return plain serializable objects (never raw
// Mongoose documents / ObjectIds) matching these DTOs.

export type ExperienceLevel = "beginner" | "intermediate" | "experienced";

export type DayType = "workout" | "rest" | "optional";

export type WorkoutStatus = "not_started" | "in_progress" | "complete";

export type ExerciseStatus = "locked" | "not_started" | "in_progress" | "complete";

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export type NotificationType =
  | "quest_available"
  | "objective_complete"
  | "quest_complete"
  | "level_up"
  | "achievement_unlocked"
  | "check_in"
  | "weekly_quest_complete"
  | "recovery_complete"
  | "party_check_in"
  | "party_quest_complete"
  | "party_level_up"
  | "party_achievement"
  | "party_objective_complete"
  | "extra_workout"
  | "party_extra_workout"
  | "nudge";

export type AssistLevel = "heavy_assist" | "light_assist" | "bodyweight";

export interface SetDTO {
  id: string;
  setNumber: number;
  weight: number | null;
  /** Assisted/Bodyweight Pull-Ups only — see SetSchema.assistLevel. Null for every other exercise. */
  assistLevel: AssistLevel | null;
  reps: number | null;
  completed: boolean;
  completedAt: string | null;
}

export interface ExerciseEntryDTO {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  repsUnit: "reps" | "seconds";
  perSide: boolean;
  status: ExerciseStatus;
  notes: string;
  sets: SetDTO[];
}

export interface DailyWorkoutDTO {
  id: string;
  templateId: string | null;
  templateName: string | null;
  date: string;
  workoutName: string;
  type: DayType;
  status: WorkoutStatus;
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
  progressPercentage: number;
  xpEarned: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
  exercises: ExerciseEntryDTO[];
}

export type ExtraWorkoutCategory = "weight_training" | "cardio" | "abs";

export type CardioIntensity = "light" | "moderate" | "intense";

export interface ExtraWorkoutDTO {
  id: string;
  date: string;
  category: ExtraWorkoutCategory;
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationMin: number | null;
  durationSec: number | null;
  intensity: CardioIntensity | null;
  notes: string;
  xpAwarded: number;
  xpBeforeCap: number;
  parWeightKg: number | null;
  createdAt: string;
}

export interface LevelUpResult {
  leveledUp: boolean;
  fromLevel: number;
  toLevel: number;
  fromRank: Rank;
  toRank: Rank;
  rankChanged: boolean;
}

export interface AchievementUnlockedDTO {
  key: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
}

export interface XpAwardResult {
  xpAwarded: number;
  levelUp: LevelUpResult;
  achievementsUnlocked: AchievementUnlockedDTO[];
}

export interface PlayerSummaryDTO {
  id: string;
  name: string;
  email: string;
  image: string | null;
  level: number;
  xp: number;
  requiredXp: number;
  rank: Rank;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  onboardingCompleted: boolean;
}
