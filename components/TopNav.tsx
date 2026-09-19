"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileHeart,
  HeartPulse,
  Home,
  Menu,
  MessageCircle,
  PersonStanding,
  Settings2,
  Stethoscope,
  Watch,
  X,
} from "lucide-react";
import { AccessibilityPanel } from "@/components/a11y/AccessibilityPanel";
import { useT } from "@/components/a11y/useT";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const MOBILE_GROUPS = [
  { label: "", items: [{ href: "/", key: "home", icon: Home }] },
  {
    label: "addHealthInfo",
    items: [
      { href: "/tell-carebridge", key: "tell", icon: MessageCircle },
      { href: "/body-picture", key: "bodyPicture", icon: PersonStanding },
      { href: "/guided-check-in", key: "guidedCheckIn", icon: ClipboardList },
    ],
  },
  {
    label: "myRecord",
    items: [
      { href: "/my-health", key: "myHealth", icon: Watch },
      { href: "/records", key: "records", icon: FileHeart },
    ],
  },
  {
    label: "doctorVisit",
    items: [
      { href: "/explain", key: "explain", icon: HeartPulse },
      { href: "/clinician", key: "clinician", icon: Stethoscope },
    ],
  },
] as const;

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/my-health") return pathname.startsWith("/my-health") || pathname.startsWith("/timeline") || pathname.startsWith("/insights");
  return pathname.startsWith(href);
}

/** Account bar on desktop; compact grouped navigation only where the
 * persistent side navigation cannot fit. */
export function TopNav() {
  const pathname = usePathname();
  const { t, lang } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuOpen]);

  return (
    <header className="top-nav-shell">
      <div className="top-nav-inner">
        <Link href="/" className="top-nav-brand" aria-label="HealthThread home">
          <BrandMark className="top-nav-brand-logo" />
        </Link>

        <div className="top-nav-account">
          <ThemeToggle />
          <AccessibilityPanel
            placement="below"
            trigger={(open) => (
              <button type="button" onClick={open} className="account-settings" aria-label={t("a11yBar.settings")}>
                <Settings2 aria-hidden />
                <span>{lang === "es" ? "Ajustes" : "Settings"}</span>
              </button>
            )}
          />
          <div className="profile-chip" aria-label={`${t("nav.demoPatient")}: Alex`}>
            <span className="profile-avatar">A</span>
            <span className="profile-copy"><strong>Alex</strong><small>{t("nav.demoPatient")}</small></span>
          </div>
        </div>

        <div ref={menuRef} className="top-nav-mobile-actions">
          <ThemeToggle />
          <AccessibilityPanel
            placement="below"
            trigger={(open) => (
              <button type="button" onClick={open} className="nav-icon-button" aria-label={t("a11yBar.settings")}>
                <Settings2 aria-hidden />
              </button>
            )}
          />
          <span className="profile-avatar" aria-label="Alex">A</span>
          <button
            type="button"
            className="nav-icon-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-main-menu"
            aria-label={menuOpen ? t("manualEntry.close") : t("nav.more")}
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>

          {menuOpen && (
            <nav id="mobile-main-menu" aria-label="Main" className="top-nav-mobile-menu fade-up">
              <p className="top-nav-mobile-heading">{lang === "es" ? "Ir a" : "Go to"}</p>
              {MOBILE_GROUPS.map((group) => (
                <div key={group.label || "home"} className="mobile-nav-group">
                  {group.label && <p>{t(`nav.${group.label}`)}</p>}
                  {group.items.map(({ href, key, icon: Icon }) => (
                    <Link key={href} href={href} aria-current={active(pathname, href) ? "page" : undefined}>
                      <Icon aria-hidden />
                      <span>{t(`nav.${key}`)}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
