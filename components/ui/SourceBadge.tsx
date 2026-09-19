import { FlaskConical, UserRound, Watch } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Provenance is never implied. Real Fitbit rows, backend-derived patient rows
 * and Alex's synthetic wearable rows each say what they are.
 */
export function SourceBadge({
  source,
  className,
}: {
  source?: "demo" | "fitbit" | "patient";
  className?: string;
}) {
  if (!source) return null;
  const Icon =
    source === "fitbit" ? Watch : source === "demo" ? FlaskConical : UserRound;
  const label =
    source === "fitbit"
      ? "Fitbit"
      : source === "demo"
        ? "Synthetic wearable data"
        : "Patient reported";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-medium text-ink",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
