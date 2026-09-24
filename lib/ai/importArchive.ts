import { detectLanguage, extractDrafts } from "@/lib/ai/fallback";
import type {
  AIImportCandidateInput,
  AIProvider,
} from "@/lib/backend/schema";
import type { DraftEvent } from "@/lib/schema";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

export type ParsedAIArchive = {
  candidates: AIImportCandidateInput[];
  messagesScanned: number;
};

type ExtractedMessage = {
  text: string;
  capturedAt: string | null;
  conversationTitle: string | null;
};

const HEALTH_WORDS = /\b(?:pain|painful|hurt|hurts|hurting|ache|aching|sore|cramp|headache|migraine|tired|fatigue|exhausted|sleep|slept|insomnia|fever|chills|nausea|nauseous|vomit|dizzy|lightheaded|period|menstrual|bleeding|spotting|urine|urinary|urination|bladder|pee|bowel|stool|constipation|diarrhea|medicine|medication|pill|appetite|rash|swelling|swollen|tingling|numb|cough|breathing|symptom|doctor|hospital|duele|dolor|cansad[oa]|fatiga|dorm[ií]|fiebre|n[aá]usea|mareo|regla|orina|vejiga|evacuaci[oó]n|heces|estre[ñn]imiento|diarrea|medicamento)\b/i;

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  other: "Other AI",
};

export function inferAIProvider(filename: string): AIProvider {
  const lower = filename.toLowerCase();
  if (lower.includes("chatgpt") || lower.includes("openai")) return "chatgpt";
  if (lower.includes("claude") || lower.includes("anthropic")) return "claude";
  if (lower.includes("gemini") || lower.includes("bard")) return "gemini";
  return "other";
}

function timestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  return null;
}

function contentText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value.map(contentText).filter((part): part is string => Boolean(part));
    return parts.length ? parts.join("\n").trim() : null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return contentText(record.parts ?? record.text ?? record.content ?? record.message);
}

function collectJsonMessages(root: unknown): ExtractedMessage[] {
  const messages: ExtractedMessage[] = [];
  const seenObjects = new WeakSet<object>();
  const seenMessages = new Set<string>();

  const add = (text: string | null, capturedAt: string | null, title: string | null) => {
    const clean = text?.replace(/\u0000/g, "").trim();
    if (!clean || clean.length < 3 || clean.length > 4000) return;
    const key = `${capturedAt ?? ""}\u0000${clean}`;
    if (seenMessages.has(key)) return;
    seenMessages.add(key);
    messages.push({ text: clean, capturedAt, conversationTitle: title });
  };

  const visit = (value: unknown, inheritedTitle: string | null = null) => {
    if (!value || typeof value !== "object") return;
    if (seenObjects.has(value as object)) return;
    seenObjects.add(value as object);
    if (Array.isArray(value)) {
      for (const item of value) visit(item, inheritedTitle);
      return;
    }

    const record = value as Record<string, unknown>;
    const title = typeof record.title === "string" && record.title.trim()
      ? record.title.trim().slice(0, 200)
      : inheritedTitle;

    // ChatGPT data exports store messages under conversation.mapping nodes.
    if (record.mapping && typeof record.mapping === "object") {
      for (const node of Object.values(record.mapping as Record<string, unknown>)) {
        if (!node || typeof node !== "object") continue;
        const message = (node as Record<string, unknown>).message;
        if (!message || typeof message !== "object") continue;
        const item = message as Record<string, unknown>;
        const author = item.author as Record<string, unknown> | undefined;
        if (author?.role === "user") {
          add(contentText(item.content), timestamp(item.create_time), title);
        }
      }
    }

    // Claude exports use chat_messages with sender: "human".
    if (Array.isArray(record.chat_messages)) {
      for (const raw of record.chat_messages) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        if (item.sender === "human" || item.role === "user") {
          add(
            contentText(item.text ?? item.content),
            timestamp(item.created_at ?? item.timestamp),
            title,
          );
        }
      }
    }

    const author = record.author as Record<string, unknown> | undefined;
    const role = String(record.role ?? record.sender ?? author?.role ?? "").toLowerCase();
    if (role === "user" || role === "human") {
      add(
        contentText(record.content ?? record.text ?? record.message),
        timestamp(record.created_at ?? record.create_time ?? record.timestamp ?? record.time),
        title,
      );
    }

    // Gemini/other exports sometimes identify the user's side by field name.
    for (const key of ["prompt", "user_prompt", "userMessage", "user_message", "query"]) {
      if (key in record) {
        add(
          contentText(record[key]),
          timestamp(record.created_at ?? record.create_time ?? record.timestamp ?? record.time),
          title,
        );
      }
    }

    for (const child of Object.values(record)) visit(child, title);
  };

  visit(root);
  return messages;
}

const HTML_BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const HTML_IGNORED_ELEMENTS = new Set([
  "script",
  "style",
  "template",
  "noscript",
]);

function htmlToPlainText(source: string): string {
  const fragment = parseFragment(source);
  const chunks: string[] = [];

  const visit = (node: DefaultTreeAdapterMap["node"]) => {
    if (node.nodeName === "#text" && "value" in node) {
      chunks.push(node.value);
      return;
    }

    if ("tagName" in node) {
      const tagName = node.tagName.toLowerCase();
      if (HTML_IGNORED_ELEMENTS.has(tagName)) return;
      if (tagName === "br") {
        chunks.push("\n");
        return;
      }
      for (const child of node.childNodes) visit(child);
      if (HTML_BLOCK_ELEMENTS.has(tagName)) chunks.push("\n\n");
      return;
    }

    if ("childNodes" in node) {
      for (const child of node.childNodes) visit(child);
    }
  };

  visit(fragment);
  return chunks.join("");
}

function collectTextMessages(source: string, html: boolean): ExtractedMessage[] {
  const plain = html ? htmlToPlainText(source) : source;
  const blocks = plain
    .split(/\n\s*\n|\r?\n(?=(?:You|User|Human|Prompt|Assistant|Claude|ChatGPT|Gemini)\s*:)/i)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const hasRoles = blocks.some((block) => /^(?:You|User|Human|Prompt|Assistant|Claude|ChatGPT|Gemini)\s*:/i.test(block));
  return blocks.flatMap((block) => {
    const user = block.match(/^(?:You|User|Human|Prompt)\s*:\s*([\s\S]+)/i);
    if (hasRoles && !user) return [];
    const text = (user?.[1] ?? block).trim();
    return text ? [{ text, capturedAt: null, conversationTitle: null }] : [];
  });
}

function candidateFor(message: ExtractedMessage, provider: AIProvider): AIImportCandidateInput | null {
  const extracted = extractDrafts(message.text);
  if (!extracted.length && !HEALTH_WORDS.test(message.text)) return null;
  const language = detectLanguage(message.text);
  const fallbackDraft: DraftEvent = {
    category: "other",
    label: "Health note",
    severity: null,
    bodyLocation: null,
    onset: null,
    pattern: null,
    trendHint: null,
    durationMinutes: null,
    cycleDay: null,
    cyclePhase: null,
    originalInput: message.text,
    inputLanguage: language,
    translation: null,
    note: null,
  };
  const drafts: DraftEvent[] = (extracted.length ? extracted : [fallbackDraft]).map((draft) => ({
    ...draft,
    originalInput: message.text,
    inputLanguage: draft.inputLanguage ?? language,
  }));
  return {
    provider,
    originalText: message.text,
    capturedAt: message.capturedAt,
    conversationTitle: message.conversationTitle,
    drafts,
  };
}

export function parseAIArchive(
  filename: string,
  source: string,
  provider: AIProvider = inferAIProvider(filename),
): ParsedAIArchive {
  const lower = filename.toLowerCase();
  let messages: ExtractedMessage[];
  if (lower.endsWith(".json")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch {
      throw new Error("invalid-json");
    }
    messages = collectJsonMessages(parsed);
  } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    messages = collectTextMessages(source, true);
  } else if (lower.endsWith(".txt")) {
    messages = collectTextMessages(source, false);
  } else {
    throw new Error("unsupported-file");
  }

  const candidates = messages
    .map((message) => candidateFor(message, provider))
    .filter((candidate): candidate is AIImportCandidateInput => Boolean(candidate));
  return { candidates, messagesScanned: messages.length };
}
