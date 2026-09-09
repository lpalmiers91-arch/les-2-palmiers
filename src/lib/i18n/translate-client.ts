// Résolution de clé "a.b.c" côté client (sans dépendance "server-only").
export function translate(
  messages: Record<string, unknown>,
  key: string,
  vars?: Record<string, string | number>,
) {
  const raw = key.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, messages);
  let out = typeof raw === "string" ? raw : key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
