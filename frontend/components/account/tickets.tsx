"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MessageSquare, Paperclip, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/data";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Avatar, EmptyState, Pill, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ago, dayMonth, fileSize, time } from "@/lib/format";

export type TicketSummary = { id: number; number: string; subject: string; status: string; status_label: string; last_message_at: string; order_number: string | null; customer?: { name: string; email: string } | null };
export type TicketDetail = TicketSummary & {
  order: { number: string; title: string | null } | null;
  messages: { id: number; body: string; from_staff: boolean; author: string; author_name: string; initials: string; attachments: { name: string; size: number | null; url: string | null }[]; created_at: string }[];
};

/** Fil de conversation (écran 35) — partagé avec l'admin (base = /account ou /admin). */
export function TicketThread({ id, base, staff = false }: { id: number; base: "/account" | "/admin"; staff?: boolean }) {
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["ticket", base, id], queryFn: () => api<TicketDetail>(`${base}/tickets/${id}`), refetchInterval: 20_000 });
  const [msg, setMsg] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const end = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [t?.messages.length]);

  if (!t) return <Skeleton className="h-full min-h-96" />;
  const mine = (m: TicketDetail["messages"][number]) => (staff ? m.from_staff : !m.from_staff);

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border-default px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-label text-text-primary">
            #{t.number} · {t.subject}
          </h2>
          <p className="truncate text-body-sm text-text-tertiary">
            {t.order ? `Commande ${t.order.number}${t.order.title ? ` · ${t.order.title.split(" —")[0]}` : ""}` : staff && t.customer ? `${t.customer.name} · ${t.customer.email}` : "Sans commande liée"}
          </p>
        </div>
        <StatusBadge status={t.status} />
        {t.status !== "RESOLVED" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              qc.setQueryData(["ticket", base, id], await api<TicketDetail>(`${base}/tickets/${id}/resolve`, { method: "POST" }));
              qc.invalidateQueries({ queryKey: ["tickets"] });
            }}
          >
            <Check /> Marquer résolu
          </Button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto bg-bg-page px-6 py-6" aria-live="polite">
        {t.messages.map((m) => (
          <div key={m.id} className={cn("flex max-w-[80%] items-end gap-3", mine(m) ? "self-end" : "self-start")}>
            {!mine(m) && <Avatar initials={m.initials} size={30} color="#635BFF" />}
            <div className={cn("flex flex-col gap-2 rounded-lg px-4 py-3", mine(m) ? "bg-brand-primary text-white" : "border border-border-default bg-bg-surface text-text-primary")}>
              <p className="text-body whitespace-pre-line">{m.body}</p>
              {m.attachments.map((a) => (
                <a key={a.name} href={a.url ?? undefined} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1.5 self-start rounded-sm px-2.5 py-1.5 text-label-sm", mine(m) ? "bg-white/15" : "bg-bg-subtle")}>
                  <Paperclip className="size-3.5" /> {a.name} {a.size ? `· ${fileSize(a.size)}` : ""}
                </a>
              ))}
              <span className={cn("text-caption", mine(m) ? "text-white/75" : "text-text-tertiary")}>
                {staff ? m.author_name : m.author} · {dayMonth(m.created_at) === dayMonth(new Date()) ? time(m.created_at) : `${dayMonth(m.created_at)} ${time(m.created_at)}`}
              </span>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="flex items-center gap-3 border-t border-border-default px-5 py-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!msg.trim()) return;
          setBusy(true);
          const fd = new FormData();
          fd.append("message", msg);
          files.forEach((f) => fd.append("attachments[]", f));
          try {
            qc.setQueryData(["ticket", base, id], await api<TicketDetail>(`${base}/tickets/${id}/messages`, { method: "POST", body: fd }));
            setMsg("");
            setFiles([]);
            qc.invalidateQueries({ queryKey: ["tickets"] });
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Envoi impossible");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="cursor-pointer rounded p-1.5 text-text-secondary hover:bg-bg-subtle" title="Joindre un fichier">
          <Paperclip className="size-5" />
          <span className="sr-only">Joindre un fichier</span>
          <input type="file" multiple accept="image/png,image/jpeg,application/pdf" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 3))} />
        </label>
        <div className="flex flex-1 flex-col gap-1">
          <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Écrire une réponse…" aria-label="Votre réponse" className="h-11 rounded-btn bg-bg-subtle px-4 text-body outline-none focus:ring-2 focus:ring-brand-primary" />
          {files.length > 0 && <span className="text-caption text-text-tertiary">{files.map((f) => f.name).join(", ")}</span>}
        </div>
        <Button type="submit" loading={busy} disabled={!msg.trim()}>
          <Send /> Envoyer
        </Button>
      </form>
    </div>
  );
}

/** Écran 35 — support client. */
export function SupportView() {
  const params = useSearchParams();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"open" | "resolved">("open");
  const [selected, setSelected] = React.useState<number | null>(null);
  const router = useRouter();
  const creating = params.get("nouveau") === "1";
  const setCreating = (v: boolean) => router.replace(v ? "/compte/support?nouveau=1" : "/compte/support", { scroll: false });
  const { data } = useQuery({ queryKey: ["tickets"], queryFn: () => api<{ data: TicketSummary[]; open: number; resolved: number }>("/account/tickets") });
  const list = (data?.data ?? []).filter((t) => (tab === "open" ? t.status !== "RESOLVED" : t.status === "RESOLVED"));
  React.useEffect(() => {
    if (selected === null && data?.data.length) setSelected((data.data.find((t) => t.status !== "RESOLVED") ?? data.data[0]).id);
  }, [data, selected]);

  return (
    <>
      {!data ? (
        <Skeleton className="h-[600px] rounded-card" />
      ) : data.data.length === 0 ? (
        <div className="rounded-card border border-border-default bg-bg-surface">
          <EmptyState icon={<MessageSquare />} title="Aucune demande" text="Une question sur un achat ? Notre équipe répond en moins de 2 h." action={<Button onClick={() => setCreating(true)}>Ouvrir un ticket</Button>} />
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-card border border-border-default bg-bg-surface lg:grid-cols-[360px_1fr]">
          <div className="border-b border-border-default lg:border-r lg:border-b-0">
            <div className="flex gap-2 border-b border-border-default p-4">
              <Pill active={tab === "open"} onClick={() => setTab("open")} className="h-8 px-3.5 text-label-sm">
                Ouverts ({data.open})
              </Pill>
              <Pill active={tab === "resolved"} onClick={() => setTab("resolved")} className="h-8 px-3.5 text-label-sm">
                Résolus ({data.resolved})
              </Pill>
            </div>
            <ul>
              {list.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setSelected(t.id)} aria-current={selected === t.id} className={cn("flex w-full flex-col gap-1.5 border-b border-border-default px-5 py-4 text-left", selected === t.id ? "bg-brand-subtle" : "hover:bg-bg-page")}>
                    <span className="flex items-center justify-between text-body-sm text-text-tertiary">
                      #{t.number} <StatusBadge status={t.status} />
                    </span>
                    <span className="text-label text-text-primary">{t.subject}</span>
                    <span className="text-body-sm text-text-tertiary">{t.status === "RESOLVED" ? dayMonth(t.last_message_at) : ago(t.last_message_at)}</span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="px-5 py-8 text-center text-body-sm text-text-secondary">Aucun ticket dans cet onglet.</li>}
            </ul>
          </div>
          <div className="min-w-0">{selected ? <TicketThread id={selected} base="/account" /> : null}</div>
        </div>
      )}
      <NewTicket
        open={creating}
        onOpenChange={setCreating}
        order={params.get("commande") ?? ""}
        onCreated={(id) => {
          qc.invalidateQueries({ queryKey: ["tickets"] });
          setSelected(id);
          setTab("open");
        }}
      />
    </>
  );
}

function NewTicket({ open, onOpenChange, order, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; order: string; onCreated: (id: number) => void }) {
  const [f, setF] = React.useState({ subject: "", message: "", order_number: order });
  const [files, setFiles] = React.useState<File[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setF((x) => ({ ...x, order_number: order })), [order]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nouveau ticket" description="Réponse sous 2 h, 7j/7.">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const fd = new FormData();
            Object.entries(f).forEach(([k, v]) => fd.append(k, v));
            files.forEach((x) => fd.append("attachments[]", x));
            try {
              const t = await api<TicketDetail>("/account/tickets", { method: "POST", body: fd });
              toast.success(`Ticket #${t.number} créé`);
              onOpenChange(false);
              setF({ subject: "", message: "", order_number: "" });
              onCreated(t.id);
            } catch (err) {
              if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Sujet" error={errors.subject}>
            <Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Ex. : lien de téléchargement expiré" />
          </Field>
          <Field label="N° de commande (facultatif)">
            <Input value={f.order_number} onChange={(e) => setF({ ...f, order_number: e.target.value })} placeholder="DN-2026-…" />
          </Field>
          <Field label="Message" error={errors.message}>
            <Textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-body-sm text-text-secondary">
            <Paperclip className="size-4" /> {files.length ? files.map((x) => x.name).join(", ") : "Joindre des captures (3 max.)"}
            <input type="file" multiple accept="image/png,image/jpeg,application/pdf" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 3))} />
          </label>
          <Button type="submit" block loading={busy}>
            Envoyer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
