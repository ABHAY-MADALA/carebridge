import Image from "next/image";

/** HealthThread's map-path heart mark and wordmark, with a palette-matched
 * asset for each app theme. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={["brand-mark", className].filter(Boolean).join(" ")} aria-hidden="true">
      <Image
        className="brand-mark-image brand-mark-light"
        src="/brand/healththread-logo-light.png"
        alt=""
        width={2066}
        height={443}
        priority
      />
      <Image
        className="brand-mark-image brand-mark-dark"
        src="/brand/healththread-logo-dark.png"
        alt=""
        width={2065}
        height={442}
        priority
      />
    </span>
  );
}
