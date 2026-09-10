"use client";

import { useEffect } from "react";

// global-error remplace jusqu'au <html> quand le layout racine lui-même échoue.
// Volontairement autonome : aucun style importé, aucune dépendance de contexte.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error boundary:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#f4f1ea",
          color: "#17130d",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, margin: 0 }}>
          Les 2 Palmiers
        </h1>
        <p style={{ maxWidth: "32rem", lineHeight: 1.6, color: "#3a352b" }}>
          Une erreur inattendue est survenue. Rechargez la page dans un instant.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#6b6559" }}>Référence&nbsp;: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{
            height: "3rem",
            padding: "0 1.5rem",
            borderRadius: "999px",
            border: 0,
            background: "#17130d",
            color: "#f4f1ea",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
