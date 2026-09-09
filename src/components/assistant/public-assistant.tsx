"use client";

import { useEffect, useState } from "react";
import { AssistantWidget } from "./assistant-widget";
import { consentDecided } from "@/lib/prefs";

/** Sur la vitrine, l'assistant ne se charge qu'après une décision de consentement. */
export function PublicAssistant() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const check = () => setOk(consentDecided());
    check();
    const t = setInterval(check, 1500);
    return () => clearInterval(t);
  }, []);

  if (!ok) return null;
  return <AssistantWidget space="public" />;
}
