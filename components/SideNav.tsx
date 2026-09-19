"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ClipboardList,
  FileHeart,
  HeartPulse,
  Home,
  MessageCircle,
  PersonStanding,
  Stethoscope,
  Watch,
} from "lucide-react";
import { HelpTip } from "@/components/HelpTip";
import { useT } from "@/components/a11y/useT";
import { cn } from "@/lib/utils";

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/my-health") {
    return pathname.startsWith("/my-health") || pathname.startsWith("/timeline") || pathname.startsWith("/insights");
  }
  return pathname.startsWith(href);
}

function NavRow({
  href,
  label,
  help,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  help: string;
  icon: typeof Home;
  pathname: string;
}) {
  const isActive = active(pathname, href);
  return (
    <div className={cn("side-nav-row", isActive && "is-active")}>
      <Link href={href} aria-current={isActive ? "page" : undefined}>
        <Icon aria-hidden />
        <span>{label}</span>
      </Link>
      <HelpTip topic={help} compact align="right" />
    </div>
  );
}

/** Persistent orientation on desktop. Related capture and visit tools are
 * visually grouped so the navigation reads as five choices, not eight. */
export function SideNav() {
  const pathname = usePathname();
  const { t, lang } = useT();

  return (
    <aside className="app-side-nav" aria-label={lang === "es" ? "Navegación" : "Navigation"}>
      <div className="side-nav-card">
        <div className="side-nav-heading">
          <p>{lang === "es" ? "IR A" : "GO TO"}</p>
          <span>{lang === "es" ? "Siempre visible" : "Always visible"}</span>
        </div>

        <nav aria-label="Main" className="side-nav-list">
          <NavRow href="/" label={t("nav.home")} help="home" icon={Home} pathname={pathname} />

          <section className={cn("side-nav-group", ["/tell-carebridge", "/body-picture", "/guided-check-in"].some((href) => active(pathname, href)) && "is-active")}>
            <div className="side-nav-group-main">
              <Link href="/tell-carebridge" aria-current={active(pathname, "/tell-carebridge") ? "page" : undefined}>
                <MessageCircle aria-hidden />
                <span>
                  <strong>{t("nav.addHealthInfo")}</strong>
                  <small>{lang === "es" ? "Habla, escribe o elige" : "Talk, type, or choose"}</small>
                </span>
              </Link>
              <HelpTip topic="tell" compact align="right" />
            </div>
            <div className="side-nav-subactions">
              <Link href="/body-picture" aria-current={active(pathname, "/body-picture") ? "page" : undefined}>
                <PersonStanding aria-hidden />{t("nav.bodyPicture")}
              </Link>
              <Link href="/guided-check-in" aria-current={active(pathname, "/guided-check-in") ? "page" : undefined}>
                <ClipboardList aria-hidden />{t("nav.guidedCheckIn")}
              </Link>
            </div>
          </section>

          <NavRow href="/my-health" label={t("nav.myHealth")} help="myHealth" icon={Watch} pathname={pathname} />
          <NavRow href="/records" label={t("nav.records")} help="records" icon={FileHeart} pathname={pathname} />

          <section className={cn("side-nav-group", ["/explain", "/clinician"].some((href) => active(pathname, href)) && "is-active")}>
            <div className="side-nav-group-main">
              <Link href="/explain" aria-current={active(pathname, "/explain") ? "page" : undefined}>
                <HeartPulse aria-hidden />
                <span>
                  <strong>{t("nav.doctorVisit")}</strong>
                  <small>{lang === "es" ? "Prepara y comparte" : "Prepare and share"}</small>
                </span>
              </Link>
              <HelpTip topic="explain" compact align="right" />
            </div>
            <Link href="/clinician" className="side-nav-doctor-link">
              <Stethoscope aria-hidden />
              {t("nav.clinician")}
              <ArrowUpRight aria-hidden />
            </Link>
          </section>
        </nav>

        <div className="side-nav-note">
          <FileHeart aria-hidden />
          <p>{t("records.privateNote")}</p>
        </div>
      </div>
    </aside>
  );
}
