"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SideNav } from "@/components/SideNav";
import { ReadAloud } from "@/components/a11y/ReadAloud";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useT } from "@/components/a11y/useT";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { DemoIndicator, ProfileSwitcher } from "@/components/profile/ProfileSwitcher";

/*
  Patient chrome (nav, settings, footer) stays off the clinician screen.
  A doctor should see the approved record, not a product menu.

  The patient experience keeps its primary navigation visible in a right-side
  rail on desktop. TopNav holds account controls and supplies the same grouped
  destinations in a compact menu only where the rail cannot fit.

  ReadAloud is mounted here, outside the clinician branch — /clinician already
  has its own explicit speech UI (Speak for Me, Read this part, the voice
  advocate), and a second global click-to-speak listener there would talk
  over it.
*/

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clinician = pathname === "/clinician";
  const { t } = useT();
  const { settings, update } = useSettings();

  if (clinician) {
    return (
      <>
        <header className="border-b-2 border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="label">{t("clinician.patientGenerated")}</p>
              <DemoIndicator className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <ProfileSwitcher compact placement="below" />
              <ThemeToggle />
            </div>
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
    <div className={`min-h-screen${pathname === "/body-picture" ? " body-screen-shell" : ""}`}>
      <TopNav />
      {settings.lowStimulation && (
        <div className="calm-view-strip" role="status" aria-live="polite">
          <div className="calm-view-strip-inner">
            <Sparkles aria-hidden />
            <span className="calm-view-strip-copy">
              <strong>{t("a11yBar.calmViewOn")}</strong>
              <small>{t("a11yBar.calmViewHint")}</small>
            </span>
            <button type="button" onClick={() => update({ lowStimulation: false })}>
              {t("a11yBar.turnOffCalmView")}
            </button>
          </div>
        </div>
      )}
      <ReadAloud />
      <div className="patient-frame">
        <div className="patient-main-column">
          <main id="main" className="workspace-main w-full px-4 pb-12 pt-8 md:px-8 md:pt-10 xl:px-10">
            {children}
          </main>
          <footer className="border-t border-line px-4 py-6 md:px-8 xl:px-10">
            <p className="max-w-3xl text-xs leading-relaxed text-muted">
              CareBridge organizes what you record and compares it with your own past
              patterns. It does not diagnose conditions or give medical advice.
            </p>
          </footer>
        </div>
        <SideNav />
      </div>
    </div>
  );
}
