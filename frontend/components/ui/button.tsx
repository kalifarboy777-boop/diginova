import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Bouton du Figma : 7 types × 3 tailles (Grand 52 / Moyen 44 / Petit 32), rayon 10. */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-btn whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover",
        secondary: "border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle",
        dark: "bg-[#111827] text-white hover:bg-black dark:bg-white dark:text-[#111827] dark:hover:bg-[#F3F4F6]",
        soft: "bg-brand-subtle text-brand-primary hover:bg-[#E0DEFF] dark:hover:bg-[#2A2670]",
        ghost: "text-brand-primary hover:bg-brand-subtle",
        white: "bg-white text-[#111827] hover:bg-[#F3F4F6]",
        danger: "bg-danger text-white hover:bg-[#B91C1C]",
        "danger-soft": "bg-danger-subtle text-danger hover:bg-[#FECACA] dark:hover:bg-[#5B1010]",
        outline: "border border-white/40 text-white hover:bg-white/10",
      },
      size: {
        lg: "h-[52px] px-[26px] text-label [&_svg]:size-[18px]",
        md: "h-11 px-5 text-label [&_svg]:size-[18px]",
        sm: "h-8 px-3.5 text-label-sm [&_svg]:size-4",
        icon: "size-11 [&_svg]:size-5",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild, loading, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
});
