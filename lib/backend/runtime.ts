import { BackendError, PROFILES } from "./schema";

export function publicDemoEnabled() {
  return process.env.HEALTHTHREAD_PUBLIC_DEMO === "1";
}

export function runtimeProfiles() {
  return publicDemoEnabled()
    ? PROFILES.filter((profile) => profile.id === "alex-demo")
    : PROFILES;
}

/** Bind the public demo to one known origin instead of trusting proxy headers. */
export function publicDemoOrigin() {
  const value =
    process.env.HEALTHTHREAD_PUBLIC_ORIGIN ?? process.env.RENDER_EXTERNAL_URL;
  if (!value) throw new BackendError(503, "public-demo-origin-required");

  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new BackendError(503, "invalid-public-demo-origin");
  }

  if (origin.pathname !== "/" || origin.search || origin.hash) {
    throw new BackendError(503, "invalid-public-demo-origin");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    origin.hostname,
  );
  if (origin.protocol !== "https:" && !(loopback && origin.protocol === "http:")) {
    throw new BackendError(503, "public-demo-https-required");
  }
  return origin;
}
