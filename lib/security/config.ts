export type SecurityMode = "local" | "production";

export function securityMode(): SecurityMode {
  return process.env.HEALTHTHREAD_SECURITY_MODE === "production"
    ? "production"
    : "local";
}

export function productionSecret(name: string, minimumLength = 32): string | null {
  const value = process.env[name]?.trim() ?? "";
  if (value.length >= minimumLength) return value;
  if (securityMode() === "production") {
    throw new Error(`${name.toLowerCase().replaceAll("_", "-")}-required`);
  }
  return null;
}

export function productionOrigin(): URL | null {
  const value = process.env.HEALTHTHREAD_APP_ORIGIN?.trim();
  if (!value) {
    if (securityMode() === "production") throw new Error("healththread-app-origin-required");
    return null;
  }
  const origin = new URL(value);
  if (
    origin.protocol !== "https:" ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("healththread-app-origin-must-be-https-origin");
  }
  return origin;
}
