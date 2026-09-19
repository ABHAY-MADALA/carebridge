export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="label mb-1">{eyebrow}</p>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink md:text-3xl">
          {title}
        </h1>
        {actions}
      </div>
      {description && (
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">{description}</p>
      )}
    </header>
  );
}
