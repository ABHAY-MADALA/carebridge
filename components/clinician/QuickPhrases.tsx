"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { BodyMap } from "@/components/manual/BodyMap";
import { useT } from "@/components/a11y/useT";

/*
  The things a patient needs to say during an appointment that no summary can
  contain, for someone who cannot say them out loud.

  Deliberately unglamorous and deliberately large. For a nonspeaking patient
  this is the difference between participating in the conversation and being
  talked about in the third person while they sit there.

  Phrase copy lives in lib/i18n/messages.ts under quickPhrases.phrases — the
  spoken `say` text gets its own Spanish version too, since the patient means
  to say it aloud in the room, not just read a translated label.
*/

const PHRASE_KEYS = [
  "yes",
  "no",
  "dontKnow",
  "slowDown",
  "moment",
  "explain",
  "notRight",
  "hurtsHere",
  "writeDown",
  "askSomething",
] as const;

type Phrase = { label: string; say: string };

export function QuickPhrases({
  speech,
}: {
  speech: ReturnType<typeof useSpeaker>;
}) {
  const { t, tRaw, lang } = useT();
  const phrases = tRaw<Record<(typeof PHRASE_KEYS)[number], Phrase>>("quickPhrases.phrases");
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState<string | null>(null);

  const speakPhrase = (key: (typeof PHRASE_KEYS)[number]) => {
    if (key === "hurtsHere") {
      setShowMap(true);
      void speech.speak(t("quickPhrases.phrases.hurtsHereFollowUp"), { speaker: "patient", lang });
      return;
    }
    void speech.speak(phrases[key].say, { speaker: "patient", lang });
  };

  return (
    <section aria-labelledby="quick-phrases-heading">
      <h2
        id="quick-phrases-heading"
        className="flex items-center gap-2 text-lg font-semibold text-ink"
      >
        <MessageSquare className="h-4 w-4" aria-hidden />
        {t("quickPhrases.heading")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("quickPhrases.subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PHRASE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="btn btn-md btn-secondary"
            onClick={() => speakPhrase(key)}
          >
            {phrases[key].label}
          </button>
        ))}
      </div>

      {showMap && (
        <div className="mt-5 rounded-xl bg-raised p-4">
          <BodyMap
            value={location}
            onChange={(next) => {
              setLocation(next);
              void speech.speak(t("quickPhrases.phrases.hurtsIn", { location: next.toLowerCase() }), {
                speaker: "patient",
                lang,
              });
            }}
          />
        </div>
      )}
    </section>
  );
}
