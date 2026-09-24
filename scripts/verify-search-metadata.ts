import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_ROUTES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/site";

const layout = readFileSync("app/layout.tsx", "utf8");
const robots = readFileSync("app/robots.ts", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");
const openGraphImage = readFileSync("app/opengraph-image.tsx", "utf8");

assert.equal(SITE_NAME, "HealthThread");
assert.equal(new URL(SITE_URL).protocol, "https:");
assert.ok(SITE_DESCRIPTION.length >= 120 && SITE_DESCRIPTION.length <= 220);
assert.ok(PUBLIC_ROUTES.some(({ path }) => path === "/"));
assert.ok(PUBLIC_ROUTES.some(({ path }) => path === "/my-health"));
assert.ok(layout.includes("SoftwareApplication"));
assert.ok(layout.includes("HealthApplication"));
assert.ok(layout.includes("metadataBase"));
assert.ok(layout.includes("openGraph"));
assert.ok(layout.includes("twitter"));
assert.ok(layout.includes("max-image-preview"));
assert.ok(robots.includes("/api/"));
assert.ok(robots.includes("sitemap.xml"));
assert.ok(sitemap.includes("PUBLIC_ROUTES"));
assert.ok(openGraphImage.includes("Synthetic public demo · Not a diagnosis"));

console.log("Search metadata, crawler rules, sitemap, structured data, and social preview checks passed.");
