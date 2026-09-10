"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { enablePush, pushPermission, pushSupported } from "@/lib/push";
import { useT } from "@/lib/i18n/provider";

/** Réglages de notification : e-mail / push, activation sur l'appareil, test. */
export function NotificationPrefs({
  initialEmail,
  initialPush,
}: {
  initialEmail: boolean;
  initialPush: boolean;
}) {
  const { t } = useT();
  const [email, setEmail] = useState(initialEmail);
  const [push, setPush] = useState(initialPush);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [perm, setPerm] = useState<string>("default");
  const [supported, setSupported] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testDone, setTestDone] = useState(false);

  useEffect(() => {
    setSupported(pushSupported());
    setPerm(pushPermission());
    setMounted(true);
  }, []);

  async function persist(nextEmail: boolean, nextPush: boolean) {
    setSaving(true);
    setSaved(false);
    await createClient().rpc("set_notification_prefs", {
      p_email: nextEmail,
      p_push: nextPush,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggle(kind: "email" | "push", value: boolean) {
    if (kind === "email") {
      setEmail(value);
      await persist(value, push);
    } else {
      setPush(value);
      await persist(email, value);
      if (value && perm !== "granted" && pushSupported()) void activateDevice();
    }
  }

  async function activateDevice() {
    setDeviceBusy(true);
    const res = await enablePush();
    setDeviceBusy(false);
    setSupported(pushSupported());
    setPerm(pushPermission());
    if (res.ok && !push) toggle("push", true);
  }

  async function sendTest() {
    setTestBusy(true);
    await createClient().rpc("send_test_notification");
    setTestBusy(false);
    setTestDone(true);
    setTimeout(() => setTestDone(false), 3000);
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="display text-[1.15rem] text-ink">{t("notifPrefs.title")}</h2>
      <p className="mt-1 text-[13px] text-ink-3">{t("notifPrefs.intro")}</p>

      <div className="mt-4 divide-y divide-line-soft">
        <Row
          label={t("notifPrefs.inApp")}
          hint={t("notifPrefs.inAppHint")}
          checked
          disabled
          onChange={() => {}}
        />
        <Row
          label={t("notifPrefs.email")}
          hint={t("notifPrefs.emailHint")}
          checked={email}
          onChange={(v) => toggle("email", v)}
        />
        <Row
          label={t("notifPrefs.push")}
          hint={t("notifPrefs.pushHint")}
          checked={push}
          onChange={(v) => toggle("push", v)}
        />
      </div>

      {saving && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-3">
          <Loader2 className="h-3 w-3 animate-spin" /> {t("console.action.saving")}
        </p>
      )}
      {saved && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-forest-2">
          <Check className="h-3 w-3" /> {t("console.action.saved")}
        </p>
      )}

      <div className="mt-5 space-y-3 border-t border-line pt-4">
        {!mounted ? null : !supported ? (
          <p className="text-[12.5px] text-ink-3">{t("notifPrefs.unsupported")}</p>
        ) : perm === "denied" ? (
          <p className="text-[12.5px] text-danger">{t("notifPrefs.blocked")}</p>
        ) : perm === "granted" ? (
          <p className="flex items-center gap-1.5 text-[12.5px] text-forest-2">
            <Bell className="h-3.5 w-3.5" /> {t("notifPrefs.deviceOn")}
          </p>
        ) : (
          <button
            onClick={activateDevice}
            disabled={deviceBusy}
            className="press flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {deviceBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {t("notifPrefs.activateDevice")}
          </button>
        )}

        <button
          onClick={sendTest}
          disabled={testBusy}
          className="press flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-medium text-ink hover:border-ink/30 disabled:opacity-50"
        >
          {testBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : testDone ? (
            <Check className="h-4 w-4 text-green-2" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {testDone ? t("notifPrefs.testSent") : t("notifPrefs.sendTest")}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        <span className="block text-[12px] text-ink-3">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-forest" : "bg-bone-3"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-bone shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        >
          {disabled && checked ? (
            <Bell className="m-1 h-3 w-3 text-forest" />
          ) : !checked ? (
            <BellOff className="m-1 h-3 w-3 text-ink-3" />
          ) : null}
        </span>
      </button>
    </label>
  );
}
