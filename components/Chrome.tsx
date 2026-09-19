"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ReadAloud } from "@/components/a11y/ReadAloud";
import { useT } from "@/components/a11y/useT";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/*
  Patient chrome (nav, settings, footer) stays off the clinician screen.
  A doctor should see the approved record, not a product menu.

  Desktop gets a persistent left Sidebar; narrow screens get MobileNav (a
  top bar plus a fixed bottom nav) instead — both mounted always, shown/
  hidden by breakpoint, so there's one nav-link source of truth in each
  rather than a JS-computed viewport switch.

  ReadAloud is mounted here, outside the clinician branch — /clinician already
  has its own explicit speech UI (Speak for Me, Read this part, the voice
  advocate), and a second global click-to-speak listener there would talk
  over it.
*/

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clinician = pathname === "/clinician";
  const { t } = useT();

  if (clinician) {
    return (
      <>
        <header className="border-b-2 border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="label">{t("clinician.patientGenerated")}</p>
            <ThemeToggle />
            <Link href="/explain" className="btn btn-sm btn-ghost">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("nav.explain")}
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-6 md:py-10">
          {children}
        </main>
      </>
    );
  }

  return (
    <div className={`flex min-h-screen${pathname === "/body-picture" ? " body-screen-shell" : ""}`}>
      <Sidebar />
      <div className="app-content flex min-h-screen min-w-0 flex-1 flex-col">
        <MobileNav />
        <div className="workspace-bar hidden md:flex">
          <span>CareBridge <span className="mx-2 opacity-40">/</span> {t(`nav.${({"/": "home", "/body-picture": "bodyPicture", "/guided-check-in": "guidedCheckIn", "/timeline": "timeline", "/insights": "insights", "/explain": "explain", "/tell-carebridge": "tell", "/my-health": "myHealth"} as Record<string, string>)[pathname] ?? "home"}`)}</span>
          <ThemeToggle />
        </div>
        <ReadAloud />
        <main id="main" className="workspace-main mx-auto w-full max-w-[1440px] flex-1 px-4 pb-8 pt-6 md:px-9 md:pb-8 md:pt-8">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-4 md:px-9 md:pb-5">
          <p className="text-xs text-muted">
            CareBridge organizes what you record and compares it with your own past
            patterns. It does not diagnose conditions or give medical advice.
          </p>
        </footer>
      </div>
    </div>
  );
}
