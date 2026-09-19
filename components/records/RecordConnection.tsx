"use client";

import { useState } from "react";
import { Building2, ChevronDown, CircleAlert, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { useT } from "@/components/a11y/useT";

export function RecordConnection() {
  const { t, tRaw } = useT();
  const [open, setOpen] = useState(false);
  const steps = tRaw<string[]>("records.connectionSteps");

  return (
    <section className="records-card connection-card" aria-labelledby="record-connection-heading">
      <div className="records-section-heading">
        <span className="records-heading-icon"><Link2 aria-hidden /></span>
        <div>
          <div className="connection-title-row">
            <h2 id="record-connection-heading">{t("records.connectionHeading")}</h2>
            <span>{t("records.connectionBadge")}</span>
          </div>
          <p>{t("records.connectionBody")}</p>
        </div>
      </div>

      <div className="connection-status">
        <span><CircleAlert aria-hidden /></span>
        <div><strong>{t("records.setupRequired")}</strong><p>{t("records.setupBody")}</p></div>
      </div>

      <button
        type="button"
        className="connection-toggle"
        aria-expanded={open}
        aria-controls="connection-explanation"
        onClick={() => setOpen((value) => !value)}
      >
        <span><Building2 aria-hidden />{open ? t("records.hideOptions") : t("records.checkOptions")}</span>
        <ChevronDown aria-hidden />
      </button>

      {open && (
        <div id="connection-explanation" className="connection-explanation fade-up">
          <ol>
            {steps.map((step, index) => (
              <li key={step}><span>{index + 1}</span><p>{step}</p></li>
            ))}
          </ol>
          <p className="connection-consent-note"><KeyRound aria-hidden />{t("records.consentNote")}</p>
        </div>
      )}

      <div className="record-safety-note">
        <ShieldCheck aria-hidden />
        <div><strong>{t("records.documentSafetyTitle")}</strong><p>{t("records.documentSafetyBody")}</p></div>
      </div>
    </section>
  );
}
