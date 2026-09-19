import { AssistantTurn, type ChatMessage, type DraftEvent } from "@/lib/schema";
import { completeJson } from "./provider";
import { ASSISTANT_SYSTEM } from "./prompts";
import { containsDiagnosticLanguage, diagnosticReason } from "./guards";
import { detectLanguage, fallbackTurn, missingFieldsFor } from "./fallback";

/*
  Orchestration for one assistant turn.

  The model is a convenience, not a dependency. Anything wrong with its
  response — unreachable, slow, malformed, unsafe, or proposing an event with
  required details missing — routes to the deterministic parser, which produces
  the same shape. The caller cannot tell the difference apart from `source`.
*/

function coerceTurn(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const r = raw as Record<string, unknown>;
  const drafts = Array.isArray(r.drafts) ? r.drafts : [];

  return {
    action: r.action === "propose" ? "propose" : "ask",
    reply: typeof r.reply === "string" ? r.reply : "",
    question: typeof r.question === "string" && r.question.trim() ? r.question : null,
    detectedLanguage: typeof r.detectedLanguage === "string" ? r.detectedLanguage : "en",
    missingFields: Array.isArray(r.missingFields) ? r.missingFields.filter((f) => typeof f === "string") : [],
    source: "llm",
    drafts: drafts.map((d) => {
      const e = (d ?? {}) as Record<string, unknown>;
      return {
        category: e.category ?? "other",
        label: typeof e.label === "string" && e.label.trim() ? e.label : "Health note",
        severity: typeof e.severity === "number" ? e.severity : null,
        bodyLocation: typeof e.bodyLocation === "string" ? e.bodyLocation : null,
        onset: typeof e.onset === "string" ? e.onset : null,
        pattern: typeof e.pattern === "string" ? e.pattern : null,
        trendHint:
          e.trendHint === "better" || e.trendHint === "same" || e.trendHint === "worse"
            ? e.trendHint
            : null,
        durationMinutes: typeof e.durationMinutes === "number" ? e.durationMinutes : null,
        originalInput: typeof e.originalInput === "string" ? e.originalInput : "",
        inputLanguage: typeof e.inputLanguage === "string" ? e.inputLanguage : "en",
        translation: typeof e.translation === "string" ? e.translation : null,
        note: typeof e.note === "string" ? e.note : null,
        cycleDay: null,
        cyclePhase: null,
      };
    }),
  };
}

function unsafe(turn: AssistantTurn): string | null {
  const texts = [turn.reply, turn.question ?? "", ...turn.drafts.map((d) => d.label)];
  for (const t of texts) {
    if (containsDiagnosticLanguage(t)) return diagnosticReason(t);
  }
  return null;
}

export async function runAssistantTurn(messages: ChatMessage[]): Promise<AssistantTurn> {
  const deterministic = fallbackTurn(messages);

  const raw = await completeJson(
    ASSISTANT_SYSTEM,
    messages.map((m) => ({ role: m.role, content: m.content })),
  );
  if (!raw) return deterministic;

  const parsed = AssistantTurn.safeParse(coerceTurn(raw));
  if (!parsed.success) {
    console.warn("[carebridge] assistant output failed validation, using fallback");
    return deterministic;
  }

  const turn = parsed.data;

  const reason = unsafe(turn);
  if (reason) {
    console.warn(`[carebridge] assistant output blocked ("${reason}"), using fallback`);
    return deterministic;
  }

  if (turn.action === "ask" && !turn.question) return deterministic;
  if (turn.action === "propose" && !turn.drafts.length) return deterministic;

  /*
    The model asks a good question but rarely fills in missingFields itself —
    the UI (e.g. the inline body map / severity scale under an "ask" turn)
    depends on that field, not on parsing the question text, so derive it the
    same deterministic way the fallback ladder would rather than trust an
    LLM-reported value that's usually just absent.
  */
  if (turn.action === "ask" && turn.drafts.length > 0) {
    const computed = missingFieldsFor(turn.drafts[0]);
    if (computed.length > 0) {
      turn.missingFields = computed;
    }
  }

  /*
    The model sometimes proposes an event while a required detail is still
    missing. Rather than discard a good extraction, keep its drafts and ask the
    question the deterministic ladder would have asked.
  */
  if (turn.action === "propose") {
    const gap = turn.drafts
      .map((d) => ({ draft: d, missing: missingFieldsFor(d as DraftEvent) }))
      .find((x) => x.missing.length > 0);

    if (gap) {
      const fallbackQuestion =
        deterministic.question ??
        `Before I save this, can you tell me the ${gap.missing[0]}?`;
      return {
        ...turn,
        action: "ask",
        question: fallbackQuestion,
        missingFields: gap.missing,
      };
    }
  }

  return {
    ...turn,
    detectedLanguage: turn.detectedLanguage || detectLanguage(
      messages.filter((m) => m.role === "user").map((m) => m.content).join(" "),
    ),
  };
}
