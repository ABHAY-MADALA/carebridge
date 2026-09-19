"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  HeartPulse,
  Home,
  MessageCircle,
  MoreHorizontal,
  PersonStanding,
  Stethoscope,
  Watch,
  X,
  Accessibility,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { AccessibilityPanel } from "@/components/a11y/AccessibilityPanel";
import { useT } from "@/components/a11y/useT";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { DemoIndicator, ProfileSwitcher } from "@/components/profile/ProfileSwitcher";

const BOTTOM_LINKS = [
  { href: "/", key: "home", icon: Home },
  { href: "/tell-carebridge", key: "tell", icon: MessageCircle },
  { href: "/timeline", key: "timeline", icon: CalendarDays },
  { href: "/explain", key: "explain", icon: HeartPulse },
] as const;

const MORE_LINKS = [
  { href: "/body-picture", key: "bodyPicture", icon: PersonStanding },
  { href: "/guided-check-in", key: "guidedCheckIn", icon: ClipboardList },
  { href: "/insights", key: "insights", icon: Activity },
  { href: "/clinician", key: "clinician", icon: Stethoscope },
  { href: "/my-health", key: "myHealth", icon: Watch },
] as const;

/** Top bar + bottom nav, below the md breakpoint. See Sidebar for desktop. */
export function MobileNav() {
  const pathname = usePathname();
  const { t } = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [moreOpen]);

  const moreActive = MORE_LINKS.some((l) => pathname.startsWith(l.href));

  return (
    <div className="md:hidden">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark className="h-6 w-6" />
          <span className="text-base font-semibold text-ink">CareBridge</span>
        </Link>
        <div className="flex items-center gap-1">
          <DemoIndicator className="hidden min-[390px]:inline-flex" />
          <ProfileSwitcher compact placement="below" />
          <ThemeToggle /><AccessibilityPanel placement="below"
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              className="btn btn-sm btn-ghost min-w-[44px]"
              aria-label={t("a11yBar.settings")}
            >
              <Accessibility size={21} strokeWidth={1.5} aria-hidden />
            </button>
          )}
        /></div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {BOTTOM_LINKS.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium",
                active ? "text-brand" : "text-muted",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(`nav.${key}`)}
            </Link>
          );
        })}

        <div ref={moreRef} className="relative flex flex-1">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium",
              moreActive || moreOpen ? "text-brand" : "text-muted",
            )}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            {t("nav.more")}
          </button>

          {moreOpen && (
            <div
              className="card fade-up absolute bottom-full right-0 mb-2 w-56 p-2 shadow-lg"
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="label !text-xs">{t("nav.more")}</p>
                <button type="button" aria-label={t("manualEntry.close")} onClick={() => setMoreOpen(false)} className="btn btn-sm btn-ghost min-w-[44px]">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <ul className="space-y-0.5">
                {MORE_LINKS.map(({ href, key, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={pathname === href ? "page" : undefined}
                      className="flex min-h-[2.75rem] items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink hover:bg-raised"
                    >
                      <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                      {t(`nav.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
