"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ title, description, children, className, wide }: { title: string; description?: React.ReactNode; children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0B0F1A]/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-bg-surface p-7 shadow-float",
          wide ? "max-w-2xl" : "max-w-md",
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-h3 text-text-primary">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="mt-1 text-body-sm text-text-secondary">{description}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="rounded-sm p-1 text-text-tertiary hover:bg-bg-subtle hover:text-text-primary" aria-label="Fermer">
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Tiroir latéral (détail de commande, candidature…). */
export function Drawer({ open, onOpenChange, title, subtitle, children, footer, width = 520 }: { open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0B0F1A]/40" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-bg-surface shadow-float" style={{ maxWidth: width }}>
          <div className="flex items-start justify-between gap-4 border-b border-border-default px-6 py-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-h4 text-text-primary">{title}</DialogPrimitive.Title>
              {subtitle && <DialogPrimitive.Description className="mt-0.5 text-body-sm text-text-secondary">{subtitle}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="rounded-sm p-1 text-text-tertiary hover:bg-bg-subtle" aria-label="Fermer">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="border-t border-border-default px-6 py-4">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** FAQ en accordéon. */
export function Faq({ items, className, defaultOpen = 0 }: { items: { q: string; a: React.ReactNode }[]; className?: string; defaultOpen?: number | null }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible defaultValue={defaultOpen === null ? undefined : `i${defaultOpen}`} className={cn("flex flex-col gap-3", className)}>
      {items.map((it, i) => (
        <AccordionPrimitive.Item key={i} value={`i${i}`} className="rounded-cover border border-border-default bg-bg-surface data-[state=open]:shadow-soft">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-body-medium text-text-primary">
              {it.q}
              <ChevronDown className="size-[18px] shrink-0 text-text-secondary transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="px-5 pb-4 text-body-sm text-text-secondary">{it.a}</AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
