import { repository } from "./index";
import { buildEvents, buildMetrics } from "./seed";
import { dateKey, startOfToday } from "@/lib/dates";

/*
  Seeds Alex on first load.

  It also RE-seeds when the newest day in storage is not today. The synthetic
  history is generated relative to the current date, so a demo opened the day
  after it was first run would otherwise show a change that "ended yesterday"
  and a timeline with an empty Today. Re-seeding keeps the story correct
  whenever the laptop is opened.

  Events the patient added themselves are preserved across a re-seed — losing
  the entry you just recorded on stage would be the worst possible bug.
*/
export async function ensureSeeded(): Promise<void> {
  const today = dateKey(startOfToday());
  const metrics = await repository.listMetrics();
  const upToDate = metrics.length > 0 && metrics[metrics.length - 1].date === today;

  if (upToDate && (await repository.isSeeded())) return;

  const existing = await repository.listEvents();
  const patientAdded = existing.filter((e) => !e.id.startsWith("seed-"));

  await repository.reset();
  await repository.putMetrics(buildMetrics());
  await repository.addEvents([...buildEvents(), ...patientAdded]);
  await repository.markSeeded();
}
