"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileDown,
  LockKeyhole,
  Printer,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useT } from "@/components/a11y/useT";

type FaxPhase = "idle" | "preparing" | "complete";

function faxDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function ShareSummary() {
  const { t } = useT();
  const [faxOpen, setFaxOpen] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [faxNumber, setFaxNumber] = useState("");
  const [approved, setApproved] = useState(false);
  const [phase, setPhase] = useState<FaxPhase>("idle");
  const timer = useRef<number | null>(null);

  const faxIsValid = useMemo(() => {
    const digits = faxDigits(faxNumber);
    return digits.length >= 10 && digits.length <= 15;
  }, [faxNumber]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function runFaxDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clinicName.trim() || !faxIsValid || !approved || phase === "preparing") return;
    setPhase("preparing");
    timer.current = window.setTimeout(() => {
      setPhase("complete");
      timer.current = null;
    }, 900);
  }

  function resetFaxDemo() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPhase("idle");
    setApproved(false);
  }

  return (
    <section
      aria-labelledby="share-summary-heading"
      className="print-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="label flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
            {t("clinician.shareEyebrow")}
          </p>
          <h2 id="share-summary-heading" className="mt-1 text-lg font-semibold text-ink">
            {t("clinician.shareHeading")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t("clinician.shareBody")}
          </p>
        </div>
        <span className="rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          {t("clinician.demoTools")}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" className="btn btn-md btn-secondary justify-start" onClick={() => window.print()}>
          <Printer className="h-5 w-5 text-brand" aria-hidden />
          <span className="text-left">
            <span className="block font-semibold">{t("clinician.printPdf")}</span>
            <span className="block text-xs font-normal text-muted">{t("clinician.printPdfHint")}</span>
          </span>
        </button>
        <button
          type="button"
          className="btn btn-md btn-secondary justify-start"
          aria-expanded={faxOpen}
          aria-controls="fax-demo-form"
          onClick={() => setFaxOpen((open) => !open)}
        >
          <Send className="h-5 w-5 text-brand" aria-hidden />
          <span className="text-left">
            <span className="block font-semibold">{t("clinician.tryFax")}</span>
            <span className="block text-xs font-normal text-muted">{t("clinician.tryFaxHint")}</span>
          </span>
        </button>
      </div>

      {faxOpen && (
        <div id="fax-demo-form" className="mt-5 border-t border-line pt-5">
          <div className="flex gap-3 rounded-xl border border-brand/25 bg-brand-soft/60 p-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="font-semibold text-ink">{t("clinician.faxDemoTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t("clinician.faxDemoBody")}</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={runFaxDemo}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-ink">
                {t("clinician.clinicName")}
                <input
                  className="field mt-1.5"
                  value={clinicName}
                  onChange={(event) => {
                    setClinicName(event.target.value);
                    if (phase === "complete") resetFaxDemo();
                  }}
                  maxLength={100}
                  required
                  placeholder={t("clinician.clinicPlaceholder")}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                {t("clinician.recipientName")}
                <input
                  className="field mt-1.5"
                  value={recipientName}
                  onChange={(event) => {
                    setRecipientName(event.target.value);
                    if (phase === "complete") resetFaxDemo();
                  }}
                  maxLength={100}
                  placeholder={t("clinician.recipientPlaceholder")}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-ink">
              {t("clinician.faxNumber")}
              <input
                className="field mt-1.5"
                value={faxNumber}
                onChange={(event) => {
                  setFaxNumber(event.target.value);
                  if (phase === "complete") resetFaxDemo();
                }}
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                required
                aria-describedby="fax-number-help"
                placeholder={t("clinician.faxPlaceholder")}
              />
              <span id="fax-number-help" className="mt-1.5 block text-xs leading-relaxed text-muted">
                {faxNumber && !faxIsValid ? t("clinician.faxInvalid") : t("clinician.faxHelp")}
              </span>
            </label>

            <div className="rounded-xl border border-line bg-bg/70 p-4">
              <p className="label">{t("clinician.reviewDestination")}</p>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">{t("clinician.clinic")}</dt>
                  <dd className="font-medium text-ink">{clinicName.trim() || t("clinician.notEntered")}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("clinician.to")}</dt>
                  <dd className="font-medium text-ink">{recipientName.trim() || t("clinician.clinicRecordsTeam")}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">{t("clinician.fax")}</dt>
                  <dd className="font-medium text-ink">{faxNumber.trim() || t("clinician.notEntered")}</dd>
                </div>
              </dl>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
                checked={approved}
                onChange={(event) => {
                  setApproved(event.target.checked);
                  if (phase === "complete") setPhase("idle");
                }}
              />
              <span>{t("clinician.faxConsent")}</span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="btn btn-md btn-primary"
                disabled={!clinicName.trim() || !faxIsValid || !approved || phase === "preparing"}
              >
                <Send className="h-4 w-4" aria-hidden />
                {phase === "preparing" ? t("clinician.preparingFax") : t("clinician.runFaxDemo")}
              </button>
              {phase === "complete" && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={resetFaxDemo}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  {t("clinician.resetDemo")}
                </button>
              )}
            </div>
          </form>

          <div className="mt-4" role="status" aria-live="polite">
            {phase === "preparing" && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-raised/60 p-4 text-sm text-ink">
                <FileDown className="h-5 w-5 animate-pulse text-brand" aria-hidden />
                {t("clinician.preparingFaxStatus")}
              </div>
            )}
            {phase === "complete" && (
              <div className="flex items-start gap-3 rounded-xl border border-good/35 bg-good/10 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good" aria-hidden />
                <div>
                  <p className="font-semibold text-ink">{t("clinician.faxCompleteTitle")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t("clinician.faxCompleteBody")}</p>
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted">{t("clinician.directNote")}</p>
        </div>
      )}
    </section>
  );
}
