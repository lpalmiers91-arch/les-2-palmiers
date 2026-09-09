"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "••••••••",
  minLength = 8,
  required = true,
  hint,
  invalid,
  tone = "light",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  hint?: React.ReactNode;
  invalid?: boolean;
  tone?: "light" | "dark";
}) {
  const [show, setShow] = useState(false);
  const id = useId();

  const dark = tone === "dark";

  return (
    <label htmlFor={id} className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span
          className={`text-[13px] font-medium ${dark ? "text-bone/80" : "text-ink-2"}`}
        >
          {label}
        </span>
        {hint}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={invalid}
          className={
            dark
              ? "h-12 w-full rounded-[12px] border border-bone/20 bg-bone/5 pl-4 pr-11 text-[14px] text-bone outline-none placeholder:text-bone/30 focus:border-bone/50"
              : "field pr-11"
          }
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className={`press absolute right-3 top-1/2 -translate-y-1/2 ${
            dark ? "text-bone/50 hover:text-bone" : "text-ink-3 hover:text-ink"
          }`}
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </label>
  );
}
