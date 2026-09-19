/*
  One small interface in front of every language model, so the rest of the app
  never knows or cares which one is configured. Swapping OpenAI for Anthropic
  or Gemini is an env var, not a refactor.

  Server-only. Nothing here may be imported into a client component, or the API
  key ends up in the browser bundle.
*/

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type CompleteOptions = {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  /** Abort signal so the caller owns the timeout policy. */
  signal?: AbortSignal;
};

export interface LlmProvider {
  readonly name: string;
  /** Returns raw model text. Callers parse and validate it themselves. */
  complete(opts: CompleteOptions): Promise<string>;
}

class OpenAiProvider implements LlmProvider {
  readonly name = "openai";
  constructor(
    private key: string,
    private model: string,
  ) {}

  async complete({ system, messages, maxTokens = 900, signal }: CompleteOptions) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }
}

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  constructor(
    private key: string,
    private model: string,
  ) {}

  async complete({ system, messages, maxTokens = 900, signal }: CompleteOptions) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature: 0.2,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.content?.[0]?.text ?? "";
  }
}

class GeminiProvider implements LlmProvider {
  readonly name = "gemini";
  constructor(
    private key: string,
    private model: string,
  ) {}

  async complete({ system, messages, maxTokens = 900, signal }: CompleteOptions) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.key}`;
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

/** Null when no key is configured — callers then use their fallback path. */
export function getProvider(): LlmProvider | null {
  const choice = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();

  if (choice === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
    );
  }
  if (choice === "gemini" && process.env.GEMINI_API_KEY) {
    return new GeminiProvider(
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    );
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    );
  }

  // Configured provider has no key: try any other key before giving up, so a
  // half-filled .env.local still produces a working demo.
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
    );
  }
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider(
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    );
  }
  return null;
}

export const LLM_TIMEOUT_MS = 8000;

/**
 * Runs the model with a hard timeout and parses its JSON.
 * Returns null on every failure mode — no key, network error, non-2xx,
 * timeout, or unparseable output — because every caller handles them the same
 * way: fall back to the deterministic path.
 */
export async function completeJson(
  system: string,
  messages: ChatTurn[],
  maxTokens = 900,
): Promise<unknown | null> {
  const provider = getProvider();
  if (!provider) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const raw = await provider.complete({
      system,
      messages,
      maxTokens,
      signal: controller.signal,
    });
    return parseLooseJson(raw);
  } catch (err) {
    console.warn("[carebridge] llm call failed, using fallback:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Models sometimes wrap JSON in prose or a code fence despite instructions. */
export function parseLooseJson(raw: string): unknown | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
