export const SITE_NAME = "HealthThread";

export const SITE_URL = "https://healththread-demo.onrender.com";

export const SITE_DESCRIPTION =
  "HealthThread is an accessible health communication app that helps patients record health experiences, understand changes over time, and prepare patient-approved summaries for healthcare conversations.";

export const PUBLIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/tell-carebridge", priority: 0.9 },
  { path: "/body-picture", priority: 0.8 },
  { path: "/guided-check-in", priority: 0.8 },
  { path: "/my-health", priority: 0.8 },
  { path: "/records", priority: 0.7 },
  { path: "/explain", priority: 0.8 },
  { path: "/clinician", priority: 0.7 },
] as const;
