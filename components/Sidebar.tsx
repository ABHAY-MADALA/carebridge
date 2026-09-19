"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  HeartPulse,
  Home,
  MessageCircle,
  PersonStanding,
  Stethoscope,
  Watch,
  Settings,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { AccessibilityPanel } from "@/components/a11y/AccessibilityPanel";
import { useT } from "@/components/a11y/useT";
import { DemoIndicator, ProfileSwitcher } from "@/components/profile/ProfileSwitcher";

const LINKS = [
  { href: "/", key: "home", icon: Home },
  { href: "/tell-carebridge", key: "tell", icon: MessageCircle },
  { href: "/body-picture", key: "bodyPicture", icon: PersonStanding },
  { href: "/guided-check-in", key: "guidedCheckIn", icon: ClipboardList },
  { href: "/my-health", key: "myHealth", icon: Watch },
  { href: "/insights", key: "insights", icon: Activity },
  { href: "/explain", key: "explain", icon: HeartPulse },
  { href: "/timeline", key: "timeline", icon: CalendarDays },
  { href: "/clinician", key: "clinician", icon: Stethoscope },
] as const;

/** Persistent left navigation, desktop and up. See MobileNav for narrow screens. */
export function Sidebar() {
  const pathname = usePathname();
  const { t, lang } = useT();

  return (
    <aside className="app-sidebar sticky top-0 z-20 hidden h-screen w-[232px] shrink-0 flex-col border-r border-line bg-surface px-4 py-7 md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <BrandMark className="h-7 w-7" />
        <span>
          <span className="block text-base font-semibold leading-tight text-ink">CareBridge</span>
          <span className="block text-xs leading-tight text-muted">Your health, in context</span>
        </span>
      </Link>

      <nav aria-label="Main" className="mt-8 flex-1">
        <ul className="space-y-1.5">
          {LINKS.map(({ href, key, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[2.75rem] items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors",
                    active ? "bg-brand-soft text-brand" : "text-muted hover:bg-raised hover:text-ink",
                  )}
                >
                  <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                  {t(`nav.${key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-2"><AccessibilityPanel trigger={(open) => <button type="button" onClick={open} className="flex w-full min-h-[46px] items-center gap-3 rounded-lg px-2.5 text-sm text-muted hover:bg-raised hover:text-ink"><Settings size={18} aria-hidden />{lang === "es" ? "Ajustes" : "Settings"}</button>} /></div>
      </nav>

      <div className="mt-3 border-t border-line pt-3">
        <DemoIndicator className="mb-2 ml-2" />
        <ProfileSwitcher />
      </div>
    </aside>
  );
}
