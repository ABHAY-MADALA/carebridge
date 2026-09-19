import { z } from "zod";
import { HealthEvent, DailyMetric, DoctorSummary } from "@/lib/schema";

export const ProfileId = z.enum(["personal", "alex-demo"]);
export type ProfileId = z.infer<typeof ProfileId>;
export const PROFILES = [
  { id: "personal" as const, name: "Abhay", kind: "personal", synthetic: false },
  { id: "alex-demo" as const, name: "Alex", kind: "demo", synthetic: true },
] as const;
export const OwnedEvent = HealthEvent.extend({ userId: ProfileId, synthetic: z.boolean() });
export type OwnedEvent = z.infer<typeof OwnedEvent>;
export const OwnedDaily = DailyMetric.extend({ userId: ProfileId, synthetic: z.boolean(), source: z.enum(["demo", "fitbit", "patient"]) });
export type OwnedDaily = z.infer<typeof OwnedDaily>;
export const OwnedSummary = DoctorSummary.extend({ userId: ProfileId, synthetic: z.boolean() });
export type OwnedSummary = z.infer<typeof OwnedSummary>;
export const HealthMetric = z.object({
  id: z.string().min(1), userId: ProfileId, synthetic: z.boolean(),
  type: z.enum(["sleepMinutes", "restingHeartRate", "steps"]),
  value: z.number().finite().nonnegative(), unit: z.enum(["minutes", "bpm", "steps"]),
  timestamp: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.literal("day"), source: z.enum(["fitbit", "demo"]), importedAt: z.string(),
  providerRecords: z.array(z.object({ id: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional() })).optional(),
});
export type HealthMetric = z.infer<typeof HealthMetric>;
export const PatientSettings = z.object({
  language: z.enum(["en", "es"]).default("en"),
  allowExternalAI: z.boolean().default(false),
}).strict();
export type PatientSettings = z.infer<typeof PatientSettings>;
export class BackendError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export function requirePersonal(id: ProfileId) {
  if (id !== "personal") throw new BackendError(403, "fitbit-personal-only");
}
