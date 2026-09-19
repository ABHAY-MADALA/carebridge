"use client";

import { MessageSquare } from "lucide-react";
import { useSpeaker } from "@/components/voice/useSpeaker";

/*
  The things a patient needs to say during an appointment that no summary can
  contain, for someone who cannot say them out loud.

  Deliberately unglamorous and deliberately large. For a nonspeaking patient
  this is the difference between participating in the conversation and being
  talked about in the third person while they sit there.
*/

const PHRASES: { label: string; say: string }[] = [
  { label: "Yes", say: "Yes." },
  { label: "No", say: "No." },
  { label: "I don't know", say: "I don't know." },
  { label: "Please slow down", say: "Could you please slow down a little?" },
  { label: "I need a moment", say: "I need a moment, please." },
  { label: "Can you explain that?", say: "Could you explain that in simpler words, please?" },
  { label: "That's not right", say: "That is not right. Let me correct it." },
  { label: "It hurts right now", say: "It hurts right now." },
  { label: "Please write it down", say: "Could you please write that down for me?" },
  { label: "I'd like to ask something", say: "I would like to ask a question, please." },
];

export function QuickPhrases({
  speech,
}: {
  speech: ReturnType<typeof useSpeaker>;
}) {
  return (
    <section className="card p-5" aria-labelledby="quick-phrases-heading">
      <h2
        id="quick-phrases-heading"
        className="flex items-center gap-2 text-xl font-bold"
      >
        <MessageSquare className="h-5 w-5" aria-hidden />
        Things I might need to say
      </h2>
      <p className="mt-1 text-sm text-muted">
        Tap one and CareBridge says it out loud for you.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PHRASES.map((p) => (
          <button
            key={p.label}
            type="button"
            className="btn btn-md btn-secondary"
            onClick={() => void speech.speak(p.say, { speaker: "patient" })}
          >
            {p.label}
          </button>
        ))}
      </div>
    </section>
  );
}
