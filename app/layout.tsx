import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider, SETTINGS_KEY } from "@/components/a11y/SettingsProvider";
import { AccessibilityBar } from "@/components/a11y/AccessibilityBar";
import { SiteNav } from "@/components/SiteNav";
import { HealthDataProvider } from "@/components/health/useHealthData";

export const metadata: Metadata = {
  title: "CareBridge",
  description:
    "Tell CareBridge what is happening however you can. It organizes your health information and helps you explain it to your doctor.",
};

// Applied before first paint so a high-contrast or large-text user never sees
// a flash of the default theme.
const noFlash = `
(function(){try{
  var s=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||"{}");
  var e=document.documentElement;
  e.dataset.textsize=s.textSize||"base";
  e.dataset.contrast=s.highContrast?"high":"normal";
  e.dataset.motion=s.lowStimulation?"reduced":"full";
  if(s.language)e.lang=s.language;
}catch(_){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-textsize="base" data-contrast="normal" data-motion="full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <SettingsProvider>
          <HealthDataProvider>
            <a className="skip-link" href="#main">
              Skip to main content
            </a>
            <AccessibilityBar />
            <SiteNav />
            <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:py-10">
              {children}
            </main>
            <footer className="mx-auto max-w-6xl px-4 pb-12 pt-4">
              <p className="text-sm text-muted">
                CareBridge organizes what you record and compares it with your own past
                patterns. It does not diagnose conditions or give medical advice.
              </p>
            </footer>
          </HealthDataProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
