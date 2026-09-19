"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, Mic, Send, Sparkles, Square, Volume2 } from "lucide-react";
import type { AssistantTurn, ChatMessage, DraftEvent, InputMethod } from "@/lib/schema";
import { useHealthData } from "@/components/health/useHealthData";
import { useVoiceInput } from "@/components/voice/useVoiceInput";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { ConfirmationCard } from "./ConfirmationCard";
import { cn } from "@/lib/utils";

/*
  The AI Health Assistant — the centre of CareBridge, not a chat bubble in a
  corner. The patient does not have to know where information belongs; they say
  what is happening and CareBridge works out the rest, asking for anything it
  genuinely needs and never filling in a blank on its own.
*/

const PROMPTS = [
  "My lower stomach has been hurting a lot today.",
  "I keep getting really tired around 3 PM.",
  "I only slept about five hours last night.",
];

export function AssistantPanel() {
  const { saveDrafts } = useHealthData();
  const { settings } = useSettings();
  const speech = useSpeaker();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turn, setTurn] = useState<AssistantTurn | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [lastMethod, setLastMethod] = useState<InputMethod>("text");

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showConfirmation = turn?.action === "propose" && turn.drafts.length > 0 && !savedCount;

  const send = useCallback(
    async (text: string, method: InputMethod, language?: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      setLastMethod(method);
      setSavedCount(0);
      setInput("");

      const next: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed, language },
      ];
      setMessages(next);
      setBusy(true);

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const data = (await res.json()) as AssistantTurn;

        /*
          Translation is fetched for the record, never to replace what was said.
          The confirmation card shows the original above the English.
        */
        let drafts = data.drafts;
        if (data.detectedLanguage && data.detectedLanguage !== "en") {
          drafts = await Promise.all(
            drafts.map(async (d) => {
              if (!d.originalInput || d.translation) return d;
              try {
                const t = await fetch("/api/translate", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ text: d.originalInput }),
                });
                const json = (await t.json()) as { english?: string };
                return { ...d, translation: json.english ?? null, inputLanguage: data.detectedLanguage };
              } catch {
                return d;
              }
            }),
          );
        }

        const resolved = { ...data, drafts };
        setTurn(resolved);

        const assistantText = [resolved.reply, resolved.question].filter(Boolean).join(" ");
        if (assistantText) {
          setMessages((m) => [...m, { role: "assistant", content: assistantText }]);
          // Read the question aloud when the patient came in by voice, or when
          // they have asked for everything to be read aloud.
          if (settings.readAloud || method === "voice") {
            void speech.speak(assistantText, { lang: resolved.detectedLanguage });
          }
        }
      } catch {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Something went wrong on my side. Your words are safe — please try sending that again.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, settings.readAloud, speech],
  );

  const voice = useVoiceInput({
    lang: settings.language,
    onResult: ({ text, languageCode }) => void send(text, "voice", languageCode),
  });

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, turn]);

  const handleSave = async () => {
    if (!turn) return;
    setSaving(true);
    try {
      const saved = await saveDrafts(turn.drafts as DraftEvent[], lastMethod);
      setSavedCount(saved.length);
      setMessages([]);
      setTurn(null);
    } finally {
      setSaving(false);
    }
  };

  const handleRevise = () => {
    setTurn((t) => (t ? { ...t, action: "ask" } : t));
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: "No problem. Tell me what I should change, or add anything I missed.",
      },
    ]);
    inputRef.current?.focus();
  };

  return (
    <section className="card p-5 md:p-7" aria-labelledby="tell-carebridge">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="tell-carebridge" className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Sparkles className="h-7 w-7 text-brand" aria-hidden />
          Tell CareBridge
        </h2>
        {speech.speaking && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={speech.stop}>
            <Square className="h-4 w-4" aria-hidden />
            Stop speaking
          </button>
        )}
      </div>

      <p className="mt-2 text-lg text-muted">
        Say or type whatever is going on. You don&apos;t need the right words, and you
        don&apos;t need to know where it belongs.
      </p>

      {/* Conversation */}
      {messages.length > 0 && (
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation with CareBridge"
          className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "fade-up max-w-[85%] rounded-2xl px-4 py-3",
                m.role === "user"
                  ? "ml-auto bg-brand text-brand-ink"
                  : "bg-raised text-ink",
              )}
            >
              <p className="label !text-xs opacity-80">
                {m.role === "user" ? "You" : "CareBridge"}
              </p>
              <p className="text-base">{m.content}</p>
            </div>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Understanding what you told me...
            </p>
          )}
        </div>
      )}

      {savedCount > 0 && (
        <div className="fade-up mt-5 rounded-xl border-2 border-good bg-brand-soft p-4">
          <p className="text-lg font-bold">
            Saved. {savedCount === 1 ? "1 entry was" : `${savedCount} entries were`} added to
            your timeline.
          </p>
          <p className="mt-1 text-base">
            CareBridge filed it in the right place for you. You don&apos;t need to do anything
            else.
          </p>
          <Link href="/timeline" className="btn btn-md btn-primary mt-3">
            <CalendarDays className="h-5 w-5" aria-hidden />
            See my timeline
          </Link>
        </div>
      )}

      {showConfirmation ? (
        <div className="mt-5">
          <ConfirmationCard
            drafts={turn.drafts as DraftEvent[]}
            onSave={handleSave}
            onRevise={handleRevise}
            saving={saving}
          />
        </div>
      ) : (
        <>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input, "text", settings.language);
            }}
          >
            <label htmlFor="tell-input" className="label">
              What&apos;s going on?
            </label>
            <textarea
              id="tell-input"
              ref={inputRef}
              className="field mt-1 min-h-[6rem] resize-y text-lg"
              placeholder={
                settings.language === "es"
                  ? "Escriba lo que siente..."
                  : "For example: my lower stomach has been hurting since yesterday"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void send(input, "text", settings.language);
                }
              }}
            />

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="submit"
                className="btn btn-lg btn-primary"
                disabled={busy || !input.trim()}
              >
                <Send className="h-5 w-5" aria-hidden />
                Tell CareBridge
              </button>

              <button
                type="button"
                onClick={() => (voice.recording ? voice.stop() : void voice.start())}
                aria-pressed={voice.recording}
                className={cn(
                  "btn btn-lg",
                  voice.recording ? "btn-primary recording-pulse" : "btn-secondary",
                )}
                disabled={busy || voice.transcribing}
              >
                {voice.transcribing ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Mic className="h-5 w-5" aria-hidden />
                )}
                {voice.recording
                  ? "Stop and send"
                  : voice.transcribing
                    ? "Understanding..."
                    : "Speak instead"}
              </button>
            </div>
          </form>

          {voice.error && (
            <p role="status" className="mt-3 rounded-xl bg-warn-soft p-3 text-base">
              {voice.error}
            </p>
          )}

          {messages.length === 0 && (
            <div className="mt-5">
              <p className="label">Not sure how to start? Try one of these</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="btn btn-sm btn-secondary text-left"
                    onClick={() => void send(p, "text", "en")}
                  >
                    &ldquo;{p}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {speech.spokenText && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft p-3">
          <Volume2 className="mt-1 h-5 w-5 shrink-0" aria-hidden />
          <span className="text-base">{speech.spokenText}</span>
        </p>
      )}
    </section>
  );
}
