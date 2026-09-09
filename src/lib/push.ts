"use client";

import { createClient } from "@/lib/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/lib/supabase/config";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Demande la permission (si besoin), s'abonne au push et enregistre
 * l'abonnement côté Supabase. Idempotent — réutilise l'abonnement existant.
 */
export async function enablePush(): Promise<
  { ok: true } | { ok: false; reason: "unsupported" | "denied" | "error" }
> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  try {
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "denied" };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
    if (!json.endpoint) return { ok: false, reason: "error" };
    const endpoint = json.endpoint;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "error" };

    // upsert par endpoint (unique) — évite les doublons entre rechargements.
    // on nettoie d'abord un éventuel abonnement du même appareil rattaché
    // à un autre compte (navigateur partagé).
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .neq("user_id", user.id);

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint,
        keys: (json.keys ?? {}) as Record<string, string>,
        user_agent: navigator.userAgent.slice(0, 300),
      },
      { onConflict: "endpoint" },
    );

    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Ré-enregistre discrètement l'abonnement si la permission est déjà accordée. */
export async function syncPushIfGranted(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  await enablePush();
}
