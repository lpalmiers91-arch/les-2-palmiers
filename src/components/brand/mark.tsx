/**
 * Marque Les 2 Palmiers — deux palmes stylisées.
 * `tone` : "ink" (sombre sur clair) · "bone" (clair sur sombre) · "brass".
 */
export function Mark({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "bone" | "brass";
}) {
  const c =
    tone === "bone"
      ? "var(--bone)"
      : tone === "brass"
        ? "var(--brass-2)"
        : "var(--ink)";
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Les 2 Palmiers"
      fill="none"
    >
      {/* deux troncs */}
      <path d="M13 29c-.6-6.4-.4-12 .8-17.6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 29c.6-6.4.4-12-.8-17.6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      {/* palmes gauche */}
      <path d="M13.8 11.4C11.2 8.9 8 7.7 4.4 8c2.4 1.4 3.8 3.4 4.6 6" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.8 11.4C12.7 8 10.4 5.4 7 4.2c1 2.6 1.1 5.1.4 7.7" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* palmes droite */}
      <path d="M18.2 11.4C20.8 8.9 24 7.7 27.6 8c-2.4 1.4-3.8 3.4-4.6 6" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.2 11.4C19.3 8 21.6 5.4 25 4.2c-1 2.6-1.1 5.1-.4 7.7" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* couronne centrale */}
      <path d="M16 11.2c-.9-2.9.1-5.8 2.6-7.8-.2 2.9-1 5.4-2.6 7.8Z" fill={c} opacity="0.9" />
      <path d="M16 11.2c.9-2.9-.1-5.8-2.6-7.8.2 2.9 1 5.4 2.6 7.8Z" fill={c} opacity="0.9" />
      <line x1="9.5" y1="29" x2="22.5" y2="29" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
