"use client";

import { useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, Pencil, X } from "lucide-react";
import type { DoctorSummary, SummarySection } from "@/lib/schema";
import { useT } from "@/components/a11y/useT";
import { cn } from "@/lib/utils";

/*
  The patient owns this text.

  They can reword any section, drop anything they would rather not share, and
  nothing leaves this screen until they approve it. Excluded sections are hidden
  rather than deleted, so changing their mind costs one click.

  A flowing document — thin dividers between sections, not a stack of
  bordered cards — with a quiet visibility toggle rather than a loud
  "don't share" button on every row.
*/

export function SummaryEditor({
  summary,
  onChange,
  disabled,
  calmMode = false,
}: {
  summary: DoctorSummary;
  onChange: (next: DoctorSummary) => void;
  disabled?: boolean;
  calmMode?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [buffer, setBuffer] = useState("");
  const [showControls, setShowControls] = useState(false);
  const { t } = useT();
  const controlsVisible = !calmMode || showControls || editingId !== null;

  const patch = (id: string, changes: Partial<SummarySection>) =>
    onChange({
      ...summary,
      // Any edit invalidates a previous approval: the doctor must only ever see
      // text the patient approved in its final form.
      approved: false,
      approvedAt: null,
      sections: summary.sections.map((s) => (s.id === id ? { ...s, ...changes } : s)),
    });

  const startEdit = (section: SummarySection) => {
    setEditingId(section.id);
    setBuffer(section.body);
  };

  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {calmMode && (
        <div className="calm-editor-toggle">
          <button
            type="button"
            onClick={() => setShowControls((visible) => !visible)}
            aria-expanded={showControls}
          >
            {showControls ? t("explain.hideEditingTools") : t("explain.reviewOrEdit")}
            <ChevronDown aria-hidden />
          </button>
        </div>
      )}
      {summary.sections.map((section) => {
        const editing = editingId === section.id;

        return (
          <div key={section.id} className={cn("p-5", !section.included && "opacity-50")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-ink">{section.heading}</h3>

              {controlsVisible && <div className="flex flex-wrap items-center gap-1">
                {section.included && !editing && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost !min-h-[2.25rem] px-2"
                    onClick={() => startEdit(section)}
                    disabled={disabled}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    {t("summaryEditor.edit")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost !min-h-[2.25rem] px-2"
                  onClick={() => patch(section.id, { included: !section.included })}
                  disabled={disabled}
                  aria-label={section.included ? t("summaryEditor.dontShare") : t("summaryEditor.shareAgain")}
                >
                  {section.included ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                </button>
              </div>}
            </div>

            {!section.included ? (
              <p className="mt-2 text-sm italic text-muted">{t("summaryEditor.notShown")}</p>
            ) : editing ? (
              <div className="mt-3">
                <label htmlFor={`edit-${section.id}`} className="label">
                  {t("summaryEditor.yourWords")}
                </label>
                <textarea
                  id={`edit-${section.id}`}
                  className="field mt-1 min-h-[7rem]"
                  value={buffer}
                  onChange={(e) => setBuffer(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      patch(section.id, { body: buffer });
                      setEditingId(null);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {t("summaryEditor.keepChange")}
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                    {t("summaryEditor.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink">{section.body}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
