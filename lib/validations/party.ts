import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Party name must be at least 2 characters").max(40),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const joinGroupSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Enter a valid invite code")
    .max(12),
});

export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

export const reactionSchema = z.object({
  notificationId: z.string().min(1),
  emoji: z.enum(["🔥", "💪", "👏"]),
});

export type ReactionInput = z.infer<typeof reactionSchema>;

export const activityCommentSchema = z.object({
  notificationId: z.string().min(1),
  text: z.string().trim().min(1, "Comment can't be empty").max(280, "Keep it under 280 characters"),
});

export type ActivityCommentInput = z.infer<typeof activityCommentSchema>;

export const nudgeSchema = z.object({
  memberUserId: z.string().min(1),
});

export type NudgeInput = z.infer<typeof nudgeSchema>;
