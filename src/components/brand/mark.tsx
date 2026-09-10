/**
 * Marque Les 2 Palmiers — deux palmiers (favicon officiel).
 * `tone` : "ink"/"navy" (marine, sur fond clair) · "bone" (clair, sur fond sombre).
 * Rendu en <img> pour rester fidèle au tracé dessiné à la main.
 */
export function Mark({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "bone" | "navy" | "green" | "brass";
}) {
  const src = tone === "bone" ? "/brand/mark-light.png" : "/brand/mark.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Les 2 Palmiers" className={className} width={64} height={64} loading="eager" />
  );
}
