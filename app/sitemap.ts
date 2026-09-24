import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map(({ path, priority }) => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency: "monthly" as const,
    priority,
  }));
}
