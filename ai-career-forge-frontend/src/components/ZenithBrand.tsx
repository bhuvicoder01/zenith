import Link from "next/link";
export default function ZenithBrand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`z-brand ${light ? "z-brand-light" : ""}`}
      aria-label="Zenith home"
    >
      <span className="z-brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      zenith<span className="z-brand-dot">.</span>
    </Link>
  );
}
