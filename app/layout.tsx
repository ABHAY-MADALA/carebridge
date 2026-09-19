import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider, SETTINGS_KEY } from "@/components/a11y/SettingsProvider";
import { Chrome } from "@/components/Chrome";
import { HealthDataProvider } from "@/components/health/useHealthData";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { ProfileLanguageSync } from "@/components/profile/ProfileLanguageSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HealthThread",
  description:
    "Record health information in your own way. HealthThread organizes confirmed updates and helps you explain them to your doctor.",
};

// Applied before first paint so a high-contrast or large-text user never sees
// a flash of the default theme.
const noFlash = `
(function(){try{
  var s=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||"{}");
  var e=document.documentElement;
  e.dataset.theme=s.theme==="light"?"light":"dark";
  e.dataset.textsize=s.textSize||"base";
  e.dataset.contrast=s.highContrast?"high":"normal";
  e.dataset.motion=s.lowStimulation?"reduced":"full";
  e.dataset.density=s.lowStimulation?"calm":"full";
  if(s.language)e.lang=s.language;
}catch(_){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      data-theme="dark"
      lang="en"
      data-textsize="base"
      data-contrast="normal"
      data-motion="full"
      data-density="full"
      className={inter.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <SettingsProvider>
          <ProfileProvider>
            <HealthDataProvider>
              <ProfileLanguageSync />
              <a className="skip-link" href="#main">
                Skip to main content
              </a>
              <Chrome>{children}</Chrome>
            </HealthDataProvider>
          </ProfileProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
