"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Droplets,
  ShieldCheck,
} from "lucide-react";
import { useHealthData } from "@/components/health/useHealthData";
import { useT } from "@/components/a11y/useT";
import { SeverityScale } from "./SeverityScale";
import {
  GUIDED_COPY,
  buildGuidedDraft,
  displayGuidedAnswer,
  hasGuidedAnswer,
  type GuidedAnswers,
  type GuidedLanguage,
  type GuidedQuestion,
  type GuidedTopic,
} from "@/lib/health/guidedHistory";
import { cn } from "@/lib/utils";

const TOPICS: GuidedTopic[] = ["cycle", "urinary", "bowel", "condition"];
const TOPIC_ICON = {
  cycle: CalendarDays,
  urinary: Droplets,
  bowel: ClipboardList,
  condition: Activity,
};

type Stage = "choose" | "questions" | "review" | "saved";

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function Choices({
  question,
  value,
  onChange,
}: {
  question: GuidedQuestion;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  const multi = question.kind === "multi";

  return (
    <div
      className="grid gap-2 sm:grid-cols-2"
      role={multi ? "group" : "radiogroup"}
      aria-label={question.prompt}
    >
      {question.options?.map((option) => {
        const active = multi ? selected.includes(option.id) : value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={active}
            onClick={() => {
              if (!multi) {
                onChange(option.id);
                return;
              }
              if (option.id === "none") {
                onChange(active ? [] : ["none"]);
                return;
              }
              const withoutNone = selected.filter((item) => item !== "none");
              onChange(
                active
                  ? withoutNone.filter((item) => item !== option.id)
                  : [...withoutNone, option.id],
              );
            }}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
              active
                ? "border-brand bg-brand-soft text-ink"
                : "border-line bg-surface text-ink hover:bg-raised",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center border",
                multi ? "rounded" : "rounded-full",
                active ? "border-brand bg-brand text-brand-ink" : "border-line-strong",
              )}
              aria-hidden
            >
              {active ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function GuidedHistoryCheckIn() {
  const { saveDrafts } = useHealthData();
  const { lang } = useT();
  const language: GuidedLanguage = lang === "es" ? "es" : "en";
  const copy = GUIDED_COPY[language];
  const [stage, setStage] = useState<Stage>("choose");
  const [topic, setTopic] = useState<GuidedTopic | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<GuidedAnswers>({});
  const [validation, setValidation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const topicCopy = topic ? copy.topics[topic] : null;
  const questions = useMemo(
    () => (topicCopy?.questions ?? []).filter((item) => !item.showWhen || answers[item.showWhen.id] === item.showWhen.equals),
    [answers, topicCopy],
  );
  const question = questions[index];
  const answered = useMemo(
    () => questions.filter((item) => hasGuidedAnswer(answers[item.id])),
    [answers, questions],
  );

  const reset = () => {
    setStage("choose");
    setTopic(null);
    setIndex(0);
    setAnswers({});
    setValidation("");
    setError("");
  };

  const chooseTopic = (next: GuidedTopic) => {
    setTopic(next);
    setAnswers({});
    setIndex(0);
    setValidation("");
    setError("");
    setStage("questions");
  };

  const setAnswer = (id: string, value: GuidedAnswers[string]) => {
    setAnswers((current) => id === "conditionArea" ? { conditionArea: value } : { ...current, [id]: value });
    setValidation("");
  };

  const advance = () => {
    if (!question) return;
    if (question.required && !hasGuidedAnswer(answers[question.id])) {
      setValidation(copy.required);
      return;
    }
    setValidation("");
    if (index === questions.length - 1) setStage("review");
    else setIndex((current) => current + 1);
  };

  const save = async () => {
    if (!topic) return;
    setSaving(true);
    setError("");
    try {
      await saveDrafts([buildGuidedDraft(topic, answers, language)], "form");
      setStage("saved");
    } catch {
      setError(
        language === "es"
          ? "No se pudo guardar este registro. Inténtalo de nuevo."
          : "This check-in could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-7" aria-labelledby="guided-history-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 id="guided-history-title" className="text-xl font-semibold text-ink">
            {copy.choose}
          </h2>
          <p className="mt-1 text-sm text-muted">{copy.intro}</p>
          <p className="mt-2 max-w-3xl text-sm text-muted">{copy.privacy}</p>
          <p className="mt-3 flex max-w-3xl items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
            <span>{copy.safety}</span>
          </p>
        </div>
      </div>

      {stage === "choose" ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {TOPICS.map((item) => {
            const Icon = TOPIC_ICON[item];
            const itemCopy = copy.topics[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => chooseTopic(item)}
                className="group rounded-2xl border border-line bg-canvas p-5 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-raised text-brand">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-4 block text-lg font-semibold text-ink">{itemCopy.label}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{itemCopy.description}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {language === "es" ? "Comenzar" : "Start"}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {stage === "questions" && question && topicCopy ? (
        <div className="mt-7 max-w-3xl">
          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <span className="font-medium text-brand">{topicCopy.label}</span>
            <span>{copy.question} {index + 1} {copy.of} {questions.length}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden>
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>

          <fieldset className="mt-7">
            <legend className="text-xl font-semibold text-ink">{question.prompt}</legend>
            {question.help ? <p className="mt-2 text-sm leading-relaxed text-muted">{question.help}</p> : null}
            <div className="mt-5">
              {question.kind === "single" || question.kind === "multi" ? (
                <Choices
                  question={question}
                  value={answers[question.id] as string | string[] | undefined}
                  onChange={(value) => setAnswer(question.id, value)}
                />
              ) : null}
              {question.kind === "date" ? (
                <input
                  type="date"
                  max={todayKey()}
                  className="field max-w-sm"
                  value={typeof answers[question.id] === "string" ? answers[question.id] as string : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                />
              ) : null}
              {question.kind === "scale" ? (
                <SeverityScale
                  value={typeof answers[question.id] === "number" ? answers[question.id] as number : null}
                  onChange={(value) => setAnswer(question.id, value)}
                  label={copy.scaleLabel}
                />
              ) : null}
              {question.kind === "text" ? (
                <textarea
                  className="field min-h-32"
                  maxLength={1000}
                  value={typeof answers[question.id] === "string" ? answers[question.id] as string : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  placeholder={language === "es" ? "Con tus propias palabras (opcional)" : "In your own words (optional)"}
                />
              ) : null}
            </div>
          </fieldset>

          {validation ? <p role="alert" className="mt-4 text-sm font-semibold text-warn">{validation}</p> : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-md btn-ghost"
              onClick={() => {
                setValidation("");
                if (index === 0) setStage("choose");
                else setIndex((current) => current - 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {copy.back}
            </button>
            <button type="button" className="btn btn-md btn-primary" onClick={advance}>
              {index === questions.length - 1 ? copy.review : copy.next}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            {!question.required && !hasGuidedAnswer(answers[question.id]) ? (
              <button type="button" className="btn btn-md btn-ghost" onClick={advance}>{copy.skip}</button>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-muted">{copy.nothingSaved}</p>
        </div>
      ) : null}

      {stage === "review" && topicCopy ? (
        <div className="mt-7 max-w-3xl">
          <p className="text-sm font-semibold text-brand">{topicCopy.label}</p>
          <h3 className="mt-1 text-2xl font-semibold text-ink">{copy.reviewTitle}</h3>
          <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-canvas px-5">
            {answered.map((item) => (
              <div key={item.id} className="py-4">
                <dt className="text-sm text-muted">{item.prompt}</dt>
                <dd className="mt-1 whitespace-pre-wrap font-medium text-ink">
                  {displayGuidedAnswer(item, answers[item.id])}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted">{copy.nothingSaved}</p>
          {error ? <p role="alert" className="mt-4 text-sm font-semibold text-warn">{error}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-lg btn-primary" disabled={saving} onClick={() => void save()}>
              <Check className="h-5 w-5" aria-hidden />
              {saving ? copy.saving : copy.save}
            </button>
            <button
              type="button"
              className="btn btn-lg btn-secondary"
              disabled={saving}
              onClick={() => {
                setIndex(0);
                setStage("questions");
              }}
            >
              {copy.editAnswers}
            </button>
          </div>
        </div>
      ) : null}

      {stage === "saved" ? (
        <div className="mt-7 max-w-2xl rounded-2xl border border-good/30 bg-good/10 p-6" role="status">
          <CheckCircle2 className="h-8 w-8 text-good" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-ink">{copy.saved}</p>
          <button type="button" className="btn btn-md btn-secondary mt-5" onClick={reset}>{copy.another}</button>
        </div>
      ) : null}
    </section>
  );
}
