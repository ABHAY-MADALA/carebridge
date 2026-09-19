import type { DoctorSummary } from "@/lib/schema";
import { completeJson } from "./provider";
import { SUMMARY_SYSTEM } from "./prompts";
import { summaryIsSafe } from "./guards";

/*
  Optional rewording pass over an already-assembled summary.

  The model is given finished text and asked only to make it clearer. It cannot
  add a fact because it is not given the raw record — just the sections. If it
  adds diagnostic language, changes the number of sections, or drops a number,
  the deterministic version ships instead.
*/

/** Numbers are the part a doctor will act on, so none may vanish in rewriting. */
function keepsEveryNumber(before: string, after: string): boolean {
  const numbers = before.match(/\d+(?:\.\d+)?/g) ?? [];
  return numbers.every((n) => after.includes(n));
}

export async function polishSummary(summary: DoctorSummary): Promise<DoctorSummary> {
  const included = summary.sections.filter((s) => s.included);
  if (!included.length) return summary;

  const payload = JSON.stringify({
    sections: included.map((s) => ({ heading: s.heading, body: s.body })),
  });

  const raw = await completeJson(SUMMARY_SYSTEM, [{ role: "user", content: payload }], 1200);
  if (!raw || typeof raw !== "object") return summary;

  const sections = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sections) || sections.length !== included.length) return summary;

  const rewritten = sections.map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    return {
      heading: typeof o.heading === "string" ? o.heading : "",
      body: typeof o.body === "string" ? o.body : "",
    };
  });

  if (rewritten.some((s) => !s.heading || !s.body)) return summary;
  if (!summaryIsSafe(rewritten)) {
    console.warn("[carebridge] summary rewrite blocked by the no-diagnosis guard");
    return summary;
  }

  const before = included.map((s) => s.body).join(" ");
  const after = rewritten.map((s) => s.body).join(" ");
  if (!keepsEveryNumber(before, after)) {
    console.warn("[carebridge] summary rewrite dropped a number, keeping the original");
    return summary;
  }

  return {
    ...summary,
    source: "llm",
    sections: summary.sections.map((s) => {
      if (!s.included) return s;
      const idx = included.findIndex((x) => x.id === s.id);
      const next = rewritten[idx];
      return next ? { ...s, heading: next.heading, body: next.body } : s;
    }),
  };
}
