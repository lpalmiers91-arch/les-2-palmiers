"use client";

import { useEffect, useState } from "react";
import { AssistantWidget } from "./assistant-widget";

/** Sur la vitrine, l'assistant ne se charge qu'après une décision de consentement. */
export function PublicAssistant() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        setOk(!!localStorage.getItem("l2p-consent-v1"));
      } catch {
        setOk(false);
      }
    };
    check();
    const t = setInterval(check, 1500);
    return () => clearInterval(t);
  }, []);

  if (!ok) return null;
  return <AssistantWidget space="public" />;
}
