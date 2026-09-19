"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Pencil, X } from "lucide-react";
import type { DoctorSummary, SummarySection } from "@/lib/schema";
import { cn } from "@/lib/utils";

/*
  The patient owns this text.

  They can reword any section, drop anything they would rather not share, and
  nothing leaves this screen until they approve it. Excluded sections are hidden
  rather than deleted, so changing their mind costs one click.
*/

export function SummaryEditor({
  summary,
  onChange,
  disabled,
}: {
  summary: DoctorSummary;
  onChange: (next: DoctorSummary) => void;
  disabled?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [buffer, setBuffer] = useState("");

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
    <ul className="space-y-4">
      {summary.sections.map((section) => {
        const editing = editingId === section.id;

        return (
          <li
            key={section.id}
            className={cn(
              "card p-4",
              !section.included && "border-dashed opacity-60",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{section.heading}</h3>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => patch(section.id, { included: !section.included })}
                  disabled={disabled}
                >
                  {section.included ? (
                    <>
                      <EyeOff className="h-4 w-4" aria-hidden />
                      Don&apos;t share this
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" aria-hidden />
                      Share this again
                    </>
                  )}
                </button>

                {section.included && !editing && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => startEdit(section)}
                    disabled={disabled}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {!section.included ? (
              <p className="mt-2 text-muted">
                This will not be shown to your doctor.
              </p>
            ) : editing ? (
              <div className="mt-3">
                <label htmlFor={`edit-${section.id}`} className="label">
                  Your words
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
                    className="btn btn-md btn-primary"
                    onClick={() => {
                      patch(section.id, { body: buffer });
                      setEditingId(null);
                    }}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    Keep this change
                  </button>
                  <button
                    type="button"
                    className="btn btn-md btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-line text-base">{section.body}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
