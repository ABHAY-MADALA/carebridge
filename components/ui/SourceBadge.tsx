import { Watch } from "lucide-react";

/**
 * Distinguishes Fitbit-sourced wearable data from what the patient recorded,
 * without becoming visual noise — renders nothing for "demo"/patient-reported
 * rows.
 */
export function SourceBadge({ source }: { source?: "demo" | "fitbit" }) {
  if (source !== "fitbit") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-medium text-ink">
      <Watch className="h-3 w-3" aria-hidden />
      Fitbit
    </span>
  );
}
