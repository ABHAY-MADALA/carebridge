/**
 * Two overlapping soft shapes — connection, not a cross or a sparkle.
 * Deliberately small in engineering scope; this is the whole brand mark.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden focusable="false">
      <path d="M6 3h14l4 4v14l-4 4H4V9Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 16c0-5 4-7 10-7 0 6-3 10-8 10m-2 1 7-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
