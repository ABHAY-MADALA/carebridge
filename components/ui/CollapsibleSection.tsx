"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/a11y/useT";

export function CollapsibleSection({
  title,
  summary,
  icon,
  help,
  children,
  defaultOpen = false,
  id,
  className,
}: {
  title: string;
  summary: React.ReactNode;
  icon?: React.ReactNode;
  help?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useT();
  const generatedId = useId();
  const contentId = `${generatedId}-content`;

  return (
    <section id={id} className={cn("disclosure-card scroll-mt-28", open && "is-open", className)}>
      <div className="disclosure-heading">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={contentId}
          className="disclosure-toggle"
        >
          {icon && <span className="disclosure-icon">{icon}</span>}
          <span className="disclosure-copy">
            <strong>{title}</strong>
            <span>{summary}</span>
          </span>
          <span className="disclosure-action">
            <span className="disclosure-action-label">{open ? t("myHealth.hide") : t("myHealth.view")}</span>
            <ChevronDown aria-hidden />
          </span>
        </button>
        {help && <div className="disclosure-help">{help}</div>}
      </div>
      {open && (
        <div id={contentId} className="disclosure-content fade-up">
          {children}
        </div>
      )}
    </section>
  );
}
