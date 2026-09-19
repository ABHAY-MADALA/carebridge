"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, HeartPulse, Home, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/insights", label: "Health Changes", icon: Activity },
  { href: "/explain", label: "Help Me Explain", icon: HeartPulse },
  { href: "/clinician", label: "Show My Doctor", icon: Stethoscope },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span aria-hidden className="text-2xl">
            &#129309;
          </span>
          CareBridge
        </Link>

        {/* Icons plus words, never icons alone. */}
        <nav aria-label="Main" className="md:ml-auto">
          <ul className="flex flex-wrap gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "btn btn-sm gap-2",
                      active ? "btn-primary" : "btn-ghost",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
