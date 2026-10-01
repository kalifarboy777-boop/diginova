"use client";

import { toast } from "sonner";
import { GoogleIcon, SparkleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function AuthTitle({ title, text }: { title: string; text?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3">
      <h1 className="text-[34px] leading-[40px] font-extrabold tracking-[-0.015em] text-text-primary md:text-h1">{title}</h1>
      {text && <p className="text-body-lg text-text-secondary">{text}</p>}
    </div>
  );
}

/** Google OAuth : actif si NEXT_PUBLIC_GOOGLE_AUTH=1 (identifiants configurés côté Laravel). */
export function GoogleButton() {
  const enabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";
  return (
    <a
      href="/api/auth/google/redirect"
      onClick={(e) => {
        if (!enabled) {
          e.preventDefault();
          toast("La connexion Google sera disponible prochainement. Utilisez votre email ou votre téléphone.");
        }
      }}
      className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-btn border border-border-strong bg-bg-surface text-label text-text-primary transition-colors hover:bg-bg-subtle"
    >
      <GoogleIcon className="size-5" /> Continuer avec Google
    </a>
  );
}

export function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-caption text-text-tertiary">
      <span className="h-px flex-1 bg-border-default" />
      {label}
      <span className="h-px flex-1 bg-border-default" />
    </div>
  );
}

/** Choix Email / Téléphone (segmenté, 48 px). */
export function ModeSwitch<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="flex rounded-md bg-bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-10 flex-1 rounded-[9px] text-label transition-colors", value === o.value ? "bg-bg-surface text-text-primary shadow-soft" : "text-text-secondary hover:text-text-primary")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PasswordlessHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-brand-subtle px-4 py-3.5 text-body-sm text-brand-primary">
      <SparkleIcon className="size-[18px] shrink-0" />
      <span>{children}</span>
    </div>
  );
}
