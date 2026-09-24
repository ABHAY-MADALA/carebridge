import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider, SETTINGS_KEY } from "@/components/a11y/SettingsProvider";
import { Chrome } from "@/components/Chrome";
import { HealthDataProvider } from "@/components/health/useHealthData";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { ProfileLanguageSync } from "@/components/profile/ProfileLanguageSync";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Your health story, in your own words`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "accessible healthcare",
    "patient communication",
    "health record",
    "symptom tracking",
    "doctor visit preparation",
    "digital health",
  ],
  creator: "HealthThread",
  publisher: "HealthThread",
  category: "health",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Your health story, in your own words`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Your health story, in your own words`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "HealthApplication",
  operatingSystem: "Any device with a modern web browser",
  isAccessibleForFree: true,
  inLanguage: ["en", "es"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: {
    "@type": "Organization",
    name: "HealthThread",
    url: "https://github.com/HEALTHTHREAD",
  },
};

const serializedSoftwareApplication = JSON.stringify(softwareApplicationJsonLd).replace(
  /</g,
  "\\u003c",
);

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializedSoftwareApplication }}
        />
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
