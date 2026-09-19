"use client";

import { useCallback, useState } from "react";
import { HelpCircle, Loader2, Mic, Square } from "lucide-react";
import type { GroundedAnswer } from "@/lib/schema";
import { useHealthData } from "@/components/health/useHealthData";
import { useVoiceInput } from "@/components/voice/useVoiceInput";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { cn } from "@/lib/utils";

/*
  The doctor asks out loud; CareBridge answers as the patient.

  Reading a summary aloud once is not enough for a nonspeaking patient, because
  the doctor immediately asks follow-up questions. This is the part that lets
  the patient actually take part in the conversation.

  Every answer comes only from the stored record. When the record does not cover
  the question, it says so — refusing is a feature here, not a failure.
*/

type Exchange = {
  question: string;
  answer: GroundedAnswer;
};

export function VoiceAdvocate({
  speech,
}: {
  speech: ReturnType<typeof useSpeaker>;
}) {
  const { events, metrics, detection } = useHealthData();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [thinking, setThinking] = useState(false);
  const [typed, setTyped] = useState("");

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      setTyped("");
      setThinking(true);

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: q, events, metrics, detection }),
        });
        const answer = (await res.json()) as GroundedAnswer;
        setExchanges((prev) => [{ question: q, answer }, ...prev]);
        void speech.speak(answer.answer, { speaker: "patient" });
      } catch {
        const answer: GroundedAnswer = {
          answered: false,
          answer:
            "I could not look that up just now. Everything I have recorded is on this screen.",
          citedEventIds: [],
          source: "fallback",
        };
        setExchanges((prev) => [{ question: q, answer }, ...prev]);
      } finally {
        setThinking(false);
      }
    },
    [events, metrics, detection, speech],
  );

  const voice = useVoiceInput({
    onResult: ({ text }) => void ask(text),
  });

  const eventById = new Map(events.map((e) => [e.id, e]));

  return (
    <section aria-labelledby="advocate-heading">
      <h2 id="advocate-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
        <HelpCircle className="h-4 w-4" aria-hidden />
        Ask me a question
      </h2>
      <p className="mt-1 text-sm text-muted">
        Speak your question and CareBridge will answer for me, using only what I have
        recorded. If I have not recorded it, it will say so rather than guess.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => (voice.recording ? voice.stop() : void voice.start())}
          aria-pressed={voice.recording}
          disabled={thinking || voice.transcribing}
          className={cn(
            "btn btn-lg",
            voice.recording ? "btn-primary recording-pulse" : "btn-primary",
          )}
        >
          {voice.transcribing ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : voice.recording ? (
            <Square className="h-5 w-5" aria-hidden />
          ) : (
            <Mic className="h-5 w-5" aria-hidden />
          )}
          {voice.recording
            ? "Stop and answer"
            : voice.transcribing
              ? "Listening..."
              : "Ask out loud"}
        </button>

        <form
          className="flex flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(typed);
          }}
        >
          <label htmlFor="advocate-typed" className="sr-only">
            Type a question instead
          </label>
          <input
            id="advocate-typed"
            className="field min-w-[14rem] flex-1"
            placeholder="or type the question"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-md btn-secondary"
            disabled={thinking || !typed.trim()}
          >
            Answer
          </button>
        </form>
      </div>

      {voice.error && (
        <p role="status" className="mt-3 rounded-xl bg-warn-soft p-3">
          {voice.error}
        </p>
      )}

      {thinking && (
        <p className="mt-4 flex items-center gap-2 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Checking the record...
        </p>
      )}

      {exchanges.length > 0 && (
        <ul className="mt-5 divide-y divide-line">
          {exchanges.map((x, i) => (
            <li key={i} className="py-4 first:pt-0">
              <p className="label">Doctor asked</p>
              <p className="text-lg font-semibold">{x.question}</p>

              <p className="label mt-3">
                {x.answer.answered ? "Answered from the record" : "Not in the record"}
              </p>
              <p
                className={cn(
                  "text-lg",
                  !x.answer.answered && "font-semibold text-warn",
                )}
              >
                {x.answer.answer}
              </p>

              {/* Citations, so the doctor can see where an answer came from. */}
              {x.answer.citedEventIds.length > 0 && (
                <div className="mt-3">
                  <p className="label">Based on</p>
                  <ul className="mt-1 space-y-1">
                    {x.answer.citedEventIds.map((id) => {
                      const e = eventById.get(id);
                      if (!e) return null;
                      return (
                        <li key={id} className="border-l-4 border-brand pl-3 text-sm">
                          <span className="font-semibold">{e.label}</span>
                          {e.severity !== null && <span> &middot; {e.severity}/10</span>}
                          <span className="text-muted">
                            {" "}
                            &middot; {new Date(e.occurredAt).toLocaleDateString("en-US")}
                          </span>
                          {e.originalInput && (
                            <p className="italic text-muted">&ldquo;{e.originalInput}&rdquo;</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <button
                type="button"
                className="btn btn-sm btn-ghost mt-2"
                onClick={() => void speech.speak(x.answer.answer, { speaker: "patient" })}
              >
                Say this again
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
