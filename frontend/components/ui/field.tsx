"use client";

import { Check, ChevronDown, Eye, EyeOff, Lock } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Libellé + champ + aide / erreur (états Défaut / Focus / Erreur / Désactivé du Figma). */
export function Field({
  label,
  htmlFor,
  help,
  error,
  className,
  action,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  help?: React.ReactNode;
  error?: string | null;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <label htmlFor={htmlFor} className="text-label text-text-primary">
              {label}
            </label>
          )}
          {action}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : help ? (
        <p className="text-caption text-text-tertiary">{help}</p>
      ) : null}
    </div>
  );
}

const shell =
  "flex h-12 w-full items-center gap-2.5 rounded-btn border border-border-strong bg-bg-surface px-3.5 text-body text-text-primary transition-colors " +
  "focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary " +
  "has-[input:disabled]:border-border-default has-[input:disabled]:bg-bg-subtle has-[input:disabled]:text-text-tertiary " +
  "data-[invalid=true]:border-danger data-[invalid=true]:ring-1 data-[invalid=true]:ring-danger [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-text-tertiary";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  invalid?: boolean;
  shellClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ icon, suffix, invalid, className, shellClassName, ...props }, ref) {
  return (
    <div className={cn(shell, shellClassName)} data-invalid={invalid || undefined}>
      {icon}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn("h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed", className)}
        {...props}
      />
      {suffix}
    </div>
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-28 w-full rounded-btn border border-border-strong bg-bg-surface px-3.5 py-3 text-body text-text-primary outline-none transition-colors placeholder:text-text-tertiary",
        "focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:bg-bg-subtle aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger",
        className,
      )}
      {...props}
    />
  );
});

/** Liste déroulante native stylée (accessible au clavier et aux lecteurs d'écran). */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; icon?: React.ReactNode; shellClassName?: string }>(
  function Select({ className, invalid, icon, shellClassName, children, ...props }, ref) {
    return (
      <div className={cn(shell, "relative pr-0", shellClassName)} data-invalid={invalid || undefined}>
        {icon}
        <select ref={ref} className={cn("h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-10 outline-none", className)} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 !size-4 !text-text-secondary" aria-hidden />
      </div>
    );
  },
);

/** Robustesse : 0 à 4 (longueur, majuscules/minuscules, chiffres, symboles). */
export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  if (!pw) score = 0;
  return { score, label: ["Trop court", "Faible", "Moyen", "Robuste", "Très robuste"][score] };
}

export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps & { meter?: boolean }>(function PasswordInput({ meter, value, ...props }, ref) {
  const [show, setShow] = React.useState(false);
  const pw = String(value ?? "");
  const { score, label } = passwordStrength(pw);
  const color = score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-success";
  const text = score <= 1 ? "text-danger" : score === 2 ? "text-warning" : "text-success";
  return (
    <div className="flex flex-col gap-2">
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        icon={<Lock />}
        value={value}
        suffix={
          <button type="button" onClick={() => setShow((s) => !s)} className="rounded p-0.5 text-text-secondary hover:text-text-primary" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        }
        {...props}
      />
      {meter && pw && (
        <div className="flex items-center gap-1.5" aria-live="polite">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full", i <= score ? color : "bg-bg-subtle")} />
          ))}
          <span className={cn("ml-1.5 text-label-sm", text)}>{label}</span>
        </div>
      )}
    </div>
  );
});

export const COUNTRIES = [
  { code: "CI", dial: "225", name: "Côte d’Ivoire" },
  { code: "SN", dial: "221", name: "Sénégal" },
  { code: "TG", dial: "228", name: "Togo" },
  { code: "BJ", dial: "229", name: "Bénin" },
  { code: "CM", dial: "237", name: "Cameroun" },
  { code: "BF", dial: "226", name: "Burkina Faso" },
  { code: "ML", dial: "223", name: "Mali" },
] as const;

/** Téléphone avec indicatif pays (+225 par défaut). La valeur émise est au format +225XXXXXXXXXX. */
export function PhoneInput({
  value,
  onChange,
  invalid,
  id,
  disabled,
  placeholder = "07 08 42 18 55",
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const country = COUNTRIES.find((c) => value.startsWith(`+${c.dial}`)) ?? COUNTRIES[0];
  const local = value.replace(`+${country.dial}`, "").replace(/\D/g, "");
  const pretty = local.replace(/(\d{2})(?=\d)/g, "$1 ");
  return (
    <div className={cn(shell, "pl-0")} data-invalid={invalid || undefined}>
      <div className="relative flex h-full items-center border-r border-border-default pr-3 pl-3.5">
        <select
          aria-label="Indicatif pays"
          value={country.code}
          disabled={disabled}
          onChange={(e) => {
            const c = COUNTRIES.find((x) => x.code === e.target.value)!;
            onChange(`+${c.dial}${local}`);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} (+{c.dial})
            </option>
          ))}
        </select>
        <span className="text-label whitespace-nowrap text-text-primary">
          {country.code} +{country.dial}
        </span>
        <ChevronDown className="ml-1.5 size-3.5 text-text-secondary" aria-hidden />
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        placeholder={placeholder}
        value={pretty}
        onChange={(e) => onChange(`+${country.dial}${e.target.value.replace(/\D/g, "").slice(0, 10)}`)}
        aria-invalid={invalid || undefined}
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-tertiary"
      />
    </div>
  );
}

/** Code à 6 chiffres : une case par chiffre, collage accepté, auto-focus. */
export function OtpInput({ value, onChange, length = 6, invalid, autoFocus }: { value: string; onChange: (v: string) => void; length?: number; invalid?: boolean; autoFocus?: boolean }) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");
  const set = (i: number, d: string) => {
    const next = digits.map((x, j) => (j === i ? d : x)).join("").replace(/\s+$/, "");
    onChange(next.replace(/\s/g, ""));
  };
  return (
    <div className="flex gap-2.5" role="group" aria-label="Code de vérification à 6 chiffres">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          aria-label={`Chiffre ${i + 1}`}
          value={d.trim()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) {
              onChange(v.slice(0, length));
              refs.current[Math.min(v.length, length) - 1]?.focus();
              return;
            }
            set(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          className={cn(
            "h-16 w-full min-w-0 rounded-md border border-border-strong bg-bg-surface text-center font-display text-[28px] font-bold text-text-primary outline-none transition-colors",
            "focus:border-2 focus:border-brand-primary",
            invalid && "border-danger",
          )}
        />
      ))}
    </div>
  );
}

export function Checkbox({ className, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  const box = (
    <span className={cn("relative inline-flex size-[18px] shrink-0", className)}>
      <input type="checkbox" className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed" {...props} />
      <span
        className="pointer-events-none flex size-[18px] items-center justify-center rounded-[5px] border-[1.5px] border-border-strong bg-bg-surface text-transparent transition-colors peer-checked:border-brand-primary peer-checked:bg-brand-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-primary peer-disabled:opacity-50"
        aria-hidden
      >
        <Check className="size-3" strokeWidth={3.5} />
      </span>
    </span>
  );
  if (!label) return box;
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-body-sm text-text-secondary">
      <span className="mt-px flex">{box}</span>
      <span>{label}</span>
    </label>
  );
}

export function Radio({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      className={cn(
        "size-5 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-strong bg-bg-surface transition-all checked:border-[6px] checked:border-brand-primary",
        className,
      )}
      {...props}
    />
  );
}

/** Interrupteur on/off (role="switch"). */
export function Toggle({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", checked ? "bg-brand-primary" : "bg-border-strong")}
    >
      <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
