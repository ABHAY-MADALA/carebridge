import type { DoctorSummary } from "@/lib/schema";
import { completeJson } from "./provider";
import { SUMMARY_SYSTEM } from "./prompts";
import { summaryIsSafe } from "./guards";

/*
  Optional rewording pass over an already-assembled, profile-scoped summary.
  It receives no records from any other profile and cannot add a fact: missing
  numbers, unsafe wording or a changed section shape returns the deterministic
  source unchanged.
*/

function keepsEveryNumber(before: string, after: string): boolean {
  const numbers = before.match(/\d+(?:\.\d+)?/g) ?? [];
  return numbers.every((number) => after.includes(number));
}

export async function polishSummary(summary: DoctorSummary): Promise<DoctorSummary> {
  const included = summary.sections.filter((section) => section.included);
  if (!included.length) return summary;

  const payload = JSON.stringify({
    sections: included.map((section) => ({
      heading: section.heading,
      body: section.body,
    })),
  });

  const raw = await completeJson(
    SUMMARY_SYSTEM,
    [{ role: "user", content: payload }],
    1200,
  );
  if (!raw || typeof raw !== "object") return summary;

  const sections = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sections) || sections.length !== included.length) return summary;

  const rewritten = sections.map((section) => {
    const value = (section ?? {}) as Record<string, unknown>;
    return {
      heading: typeof value.heading === "string" ? value.heading : "",
      body: typeof value.body === "string" ? value.body : "",
    };
  });

  if (rewritten.some((section) => !section.heading || !section.body)) return summary;
  if (!summaryIsSafe(rewritten)) return summary;

  const before = included.map((section) => section.body).join(" ");
  const after = rewritten.map((section) => section.body).join(" ");
  if (!keepsEveryNumber(before, after)) return summary;

  return {
    ...summary,
    source: "llm",
    sections: summary.sections.map((section) => {
      /*
        Onset wording is deterministic and provenance-sensitive. The redesign's
        onset fix deliberately made this section ineligible for model rewriting.
      */
      if (!section.included || section.id === "started") return section;
      const index = included.findIndex((candidate) => candidate.id === section.id);
      const next = rewritten[index];
      return next
        ? { ...section, heading: next.heading, body: next.body }
        : section;
    }),
  };
}
