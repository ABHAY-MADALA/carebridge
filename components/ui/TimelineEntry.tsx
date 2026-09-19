/*
  One dot + connecting line + content row. Timeline and Home's "Today" both
  use this so the record actually reads as a chronology instead of a grid
  of unrelated cards.
*/
export function TimelineEntry({
  time,
  title,
  meta,
  quote,
  source,
  last,
  trailing,
}: {
  time: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  quote?: string;
  source?: React.ReactNode;
  last?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-hidden />
        {!last && <span className="mt-1 w-px flex-1 bg-line" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1 pb-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 break-words">
            <p className="text-sm text-muted">{time}</p>
            <p className="mt-0.5 font-medium text-ink">{title}</p>
            {meta}
            {quote && <p className="mt-1.5 text-sm italic text-muted">&ldquo;{quote}&rdquo;</p>}
            {source}
          </div>
          {trailing}
        </div>
      </div>
    </li>
  );
}
