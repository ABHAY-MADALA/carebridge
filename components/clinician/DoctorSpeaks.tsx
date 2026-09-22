"use client";

import { useCallback, useState } from "react";
import { Loader2, Mic, Save, Square, Volume2 } from "lucide-react";
import type { ExplainBack } from "@/lib/schema";
import { useHealthData } from "@/components/health/useHealthData";
import { useVoiceInput } from "@/components/voice/useVoiceInput";
import { useSpeaker } from "@/components/voice/useSpeaker";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { cn } from "@/lib/utils";

/*
  The doctor's side of the bridge.

  The doctor talks normally; HealthThread rewrites it in plain language, speaks it
  to the patient, and saves it to the timeline. The patient leaves with what was
  actually said instead of trying to remember it in the car park.

  The doctor's original wording is kept next to the simplified version — the same
  never-discard-the-original rule that governs patient input, applied in both
  directions.
*/

export function DoctorSpeaks({ speech }: { speech: ReturnType<typeof useSpeaker> }) {
  const { saveDrafts } = useHealthData();
  const { settings } = useSettings();

  const [result, setResult] = useState<ExplainBack | null>(null);
  const [working, setWorking] = useState(false);
  const [typed, setTyped] = useState("");
  const [saved, setSaved] = useState(false);

  const process = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      setTyped("");
      setWorking(true);
      setSaved(false);

      try {
        const res = await fetch("/api/explain-back", {
          method: "POST",
          headers: { "content-type": "application/json", "x-carebridge-request": "1" },
          body: JSON.stringify({ text: t, language: settings.language }),
        });
        const data = (await res.json()) as ExplainBack;
        setResult(data);
        void speech.speak(data.translated ?? data.plain, {
          speaker: "patient",
          lang: data.translated ? settings.language : "en",
        });
      } catch {
        setResult({
          original: t,
          plain: t,
          translated: null,
          language: settings.language,
          source: "fallback",
        });
      } finally {
        setWorking(false);
      }
    },
    [settings.language, speech],
  );

  const voice = useVoiceInput({ onResult: ({ text }) => void process(text) });

  const keep = useCallback(async () => {
    if (!result) return;
    await saveDrafts(
      [
        {
          category: "doctor_instruction",
          label: "What my doctor told me",
          note: result.plain,
          // The doctor's exact words are the original here.
          originalInput: result.original,
          inputLanguage: "en",
          translation: result.translated ?? result.plain,
          severity: null,
          bodyLocation: null,
          onset: null,
          pattern: null,
          trendHint: null,
          durationMinutes: null,
          cycleDay: null,
          cyclePhase: null,
        },
      ],
      "clinician",
    );
    setSaved(true);
  }, [result, saveDrafts]);

  return (
    <section aria-labelledby="doctor-speaks-heading">
      <h2 id="doctor-speaks-heading" className="text-lg font-semibold text-ink">
        For the doctor: explain something to me
      </h2>
      <p className="mt-1 text-sm text-muted">
        Say what you would normally say. HealthThread will put it in plain words, read it to
        the patient, and save it so they do not have to remember it.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => (voice.recording ? voice.stop() : void voice.start())}
          aria-pressed={voice.recording}
          disabled={working || voice.transcribing}
          className={cn(
            "btn btn-lg",
            voice.recording ? "btn-primary recording-pulse" : "btn-secondary",
          )}
        >
          {voice.transcribing || working ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : voice.recording ? (
            <Square className="h-5 w-5" aria-hidden />
          ) : (
            <Mic className="h-5 w-5" aria-hidden />
          )}
          {voice.recording ? "Stop" : working ? "Working..." : "Speak to the patient"}
        </button>

        <form
          className="flex flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void process(typed);
          }}
        >
          <label htmlFor="doctor-typed" className="sr-only">
            Or type what you want to explain
          </label>
          <input
            id="doctor-typed"
            className="field min-w-[14rem] flex-1"
            placeholder="or type it here"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button type="submit" className="btn btn-md btn-secondary" disabled={working || !typed.trim()}>
            Put in plain words
          </button>
        </form>
      </div>

      {voice.error && (
        <p role="status" className="mt-3 rounded-xl bg-warn-soft p-3">
          {voice.error}
        </p>
      )}

      {result && (
        <div className="fade-up mt-5 space-y-4">
          <div className="rounded-xl bg-raised p-4">
            <p className="label">In plain words, for the patient</p>
            <p className="mt-1 text-lg">{result.plain}</p>
            {result.translated && (
              <>
                <p className="label mt-3">In the patient&apos;s language</p>
                <p className="mt-1 text-lg">{result.translated}</p>
              </>
            )}
            <button
              type="button"
              className="btn btn-sm btn-secondary mt-3"
              onClick={() =>
                void speech.speak(result.translated ?? result.plain, {
                  speaker: "patient",
                  lang: result.translated ? settings.language : "en",
                })
              }
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              Read it again
            </button>
          </div>

          <div className="border-l-4 border-line pl-3">
            <p className="label">What the doctor actually said</p>
            <p className="italic">&ldquo;{result.original}&rdquo;</p>
          </div>

          {saved ? (
            <p className="rounded-xl border-2 border-good bg-brand-soft p-3 font-semibold">
              Saved to the patient&apos;s timeline.
            </p>
          ) : (
            <button type="button" className="btn btn-md btn-primary" onClick={() => void keep()}>
              <Save className="h-5 w-5" aria-hidden />
              Save this to my timeline
            </button>
          )}
        </div>
      )}
    </section>
  );
}
