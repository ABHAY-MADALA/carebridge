import type { DailyMetric, DoctorSummary, HealthEvent } from "@/lib/schema";

/*
  The whole app talks to this interface, never to localStorage directly.
  Swapping in Supabase later means writing one more implementation and changing
  the export in ./index.ts — no component or page changes.
*/
export interface Repository {
  listEvents(): Promise<HealthEvent[]>;
  addEvent(event: HealthEvent): Promise<void>;
  addEvents(events: HealthEvent[]): Promise<void>;
  updateEvent(id: string, patch: Partial<HealthEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;

  listMetrics(): Promise<DailyMetric[]>;
  putMetrics(metrics: DailyMetric[]): Promise<void>;

  getSummary(): Promise<DoctorSummary | null>;
  saveSummary(summary: DoctorSummary | null): Promise<void>;

  /** True once the demo patient has been seeded. */
  isSeeded(): Promise<boolean>;
  markSeeded(): Promise<void>;
  reset(): Promise<void>;
}
