"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FlaskConical, UserRound, X } from "lucide-react";
import { useProfile } from "@/components/profile/ProfileProvider";
import { cn } from "@/lib/utils";

export function ProfileSwitcher({
  compact = false,
  placement = "above",
}: {
  compact?: boolean;
  placement?: "above" | "below";
}) {
  const { profile, profiles, switchProfile, switching } = useProfile();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg text-left hover:bg-raised",
          compact ? "min-h-[44px] px-2 py-1.5" : "px-2 py-2",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
          {profile.name.charAt(0)}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">
              {profile.name}
            </span>
            <span className="block truncate text-xs text-muted">
              {profile.synthetic ? "Demo Patient" : "Personal"}
            </span>
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch profile"
          className={cn(
            "card fade-up absolute z-50 w-64 p-2 shadow-xl",
            placement === "above" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2",
          )}
        >
          <div className="flex items-center justify-between px-2 py-1">
            <p className="label !text-xs">Switch profile</p>
            <button
              type="button"
              className="btn btn-sm btn-ghost min-w-[44px]"
              aria-label="Close profile switcher"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {profiles.map((candidate) => {
            const active = candidate.id === profile.id;
            const Icon = candidate.synthetic ? FlaskConical : UserRound;
            return (
              <button
                key={candidate.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={cn(
                  "mt-1 flex min-h-[52px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                  active ? "bg-brand-soft text-brand" : "text-ink hover:bg-raised",
                )}
                disabled={active || switching}
                onClick={() => {
                  setOpen(false);
                  void switchProfile(candidate.id);
                }}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span>
                  <span className="block font-semibold">{candidate.name}</span>
                  <span className="block text-xs text-muted">
                    {candidate.synthetic ? "Demo · Synthetic data" : "Personal"}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="mt-2 px-2 pb-1 text-xs text-muted">
            These are two isolated local hackathon profiles, not family accounts.
          </p>
        </div>
      )}
    </div>
  );
}

export function DemoIndicator({ className }: { className?: string }) {
  const { profile } = useProfile();
  if (!profile.synthetic) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-ink",
        className,
      )}
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden />
      Demo · Synthetic data
    </span>
  );
}
