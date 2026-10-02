"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Download, Smartphone } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { RevenueBars } from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Field, Input, OtpInput } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { api, ApiError, download } from "@/lib/api";
import { cn } from "@/lib/cn";
import { date, fcfa, fcfaShort, num } from "@/lib/format";

type E = {
  balance: { available: number; pending: number; withdrawn_year: number; payouts_year: number };
  commission: { rate: number; plan: string; standard: number; pro: number };
  minimum: number;
  chart: { points: { label: string; value: number }[]; change: number | null };
  payouts: { id: number; reference: string; amount: number; account: string; status: string; status_label: string; created_at: string }[];
  accounts: { id: number; method: string; label: string; masked: string; is_default: boolean }[];
  phone: string | null;
};

/** Écran 44 — revenus, historique et demande de retrait (confirmation par code SMS). */
export function Earnings() {
  const qc = useQueryClient();
  const { data: e } = useQuery({ queryKey: ["studio", "earnings"], queryFn: () => api<E>("/studio/earnings") });
  const [amount, setAmount] = React.useState<number | null>(null);
  const [account, setAccount] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [otp, setOtp] = React.useState<{ phone: string } | null>(null);
  const [code, setCode] = React.useState("");

  if (!e) return <Skeleton className="h-[800px] rounded-card" />;
  const amt = amount ?? e.balance.available;
  const acc = account ?? e.accounts.find((a) => a.is_default)?.id ?? e.accounts[0]?.id;
  const year = new Date().getFullYear();

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ phone: string }>("/studio/payouts/request", { method: "POST", body: { amount: amt, account_id: acc } });
      setOtp(r);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? (err.field("amount") ?? err.message) : "Erreur");
    } finally {
      setBusy(false);
    }
  };
  const confirm = async (c = code) => {
    setBusy(true);
    try {
      const r = await api<{ reference: string }>("/studio/payouts/confirm", { method: "POST", body: { code: c } });
      toast.success(`Retrait ${r.reference} demandé · versé sous 48 h ouvrées.`);
      setOtp(null);
      setAmount(null);
      qc.invalidateQueries({ queryKey: ["studio"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.field("code") ?? err.message) : "Code invalide");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-lg bg-brand-deep p-5 text-white dark:bg-[#1E1B4B]">
          <span className="text-body-sm text-[#C7D2FE]">Solde disponible</span>
          <span className="font-display text-[30px] leading-10 font-extrabold">{fcfa(e.balance.available)}</span>
          <span className="text-caption text-[#C7D2FE]">Retirable maintenant</span>
        </div>
        {[
          ["En période de garantie", fcfa(e.balance.pending), "Disponible sous 7 jours"],
          [`Total retiré en ${year}`, fcfa(e.balance.withdrawn_year), `${e.balance.payouts_year} retraits`],
          ["Commission DigiNova", `${e.commission.rate} %`, e.commission.plan === "PRO" ? `Plan Pro · ${e.commission.standard} % en plan standard` : `Plan Créateur · ${e.commission.pro} % en plan Pro`],
        ].map(([l, v, h]) => (
          <div key={l} className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-5">
            <span className="text-body-sm text-text-secondary">{l}</span>
            <span className="font-display text-[30px] leading-10 font-extrabold text-text-primary">{v}</span>
            <span className="text-caption text-text-tertiary">{h}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-h4">Revenus nets par mois ({year})</h2>
              {e.chart.change !== null && <span className={cn("rounded-full px-2.5 py-1 text-label-sm", e.chart.change >= 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger")}>{e.chart.change >= 0 ? "+" : ""}{e.chart.change} % ce mois</span>}
            </div>
            <RevenueBars data={e.chart.points} height={220} />
          </section>
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <h2 className="mb-3 text-h4">Historique des retraits</h2>
            <Table>
              <thead>
                <tr>
                  {["Date", "Référence", "Méthode", "Montant", "Statut"].map((h) => (
                    <Th key={h} className="bg-transparent px-0 text-caption font-medium tracking-normal normal-case first:pl-0">
                      {h}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.payouts.map((p) => (
                  <tr key={p.id}>
                    <Td className="pl-0 whitespace-nowrap first:pl-0">{date(p.created_at)}</Td>
                    <Td>{p.reference}</Td>
                    <Td className="whitespace-nowrap">{p.account}</Td>
                    <Td className="text-label whitespace-nowrap">{fcfaShort(p.amount)}</Td>
                    <Td>
                      <StatusBadge status={p.status} label={p.status === "PAID" ? "Versé" : p.status === "PROCESSING" || p.status === "REQUESTED" ? "En cours" : "Échoué"} />
                    </Td>
                  </tr>
                ))}
                {e.payouts.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-text-secondary">
                      Aucun retrait pour le moment.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>
        </div>

        <section id="retrait" className="flex scroll-mt-6 flex-col gap-5 self-start rounded-card border-2 border-brand-primary bg-bg-surface p-6">
          <h2 className="text-h4">Demander un retrait</h2>
          <Field label="Montant" error={error} help={`Minimum ${fcfa(e.minimum)} · maximum ${fcfa(e.balance.available)}`}>
            <Input inputMode="numeric" value={num(amt)} onChange={(ev) => setAmount(Number(ev.target.value.replace(/\D/g, "")) || 0)} suffix={<span className="text-body-sm text-text-tertiary">FCFA</span>} invalid={!!error} />
          </Field>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-label">Recevoir sur</legend>
            {e.accounts.map((a) => (
              <label key={a.id} className={cn("flex cursor-pointer items-center gap-3.5 rounded-cover p-4", acc === a.id ? "border-2 border-brand-primary bg-brand-subtle" : "border border-border-default")}>
                <input type="radio" name="acc" className="sr-only" checked={acc === a.id} onChange={() => setAccount(a.id)} />
                <span className={cn("size-5 rounded-full border bg-white", acc === a.id ? "border-[6px] border-brand-primary" : "border-[1.5px] border-border-strong")} />
                {a.method === "BANK" ? <Building2 className="size-[18px] text-text-secondary" /> : <Smartphone className="size-[18px] text-text-secondary" />}
                <span className="flex flex-col">
                  <span className="text-label">{a.label}</span>
                  <span className="text-caption text-text-tertiary">{a.masked}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <dl className="flex flex-col gap-2 rounded-md bg-bg-page p-4 text-body-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Frais de retrait</dt>
              <dd className="text-label">0 FCFA</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Délai estimé</dt>
              <dd className="text-label">48 h ouvrées</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Vous recevrez</dt>
              <dd className="text-label">{fcfa(amt)}</dd>
            </div>
          </dl>
          <Button size="lg" block loading={busy && !otp} disabled={amt < e.minimum || amt > e.balance.available || !acc} onClick={request}>
            Confirmer le retrait
          </Button>
          <p className="text-caption text-text-tertiary">Un code de confirmation vous sera envoyé par SMS.</p>
        </section>
      </div>

      <Dialog open={!!otp} onOpenChange={(o) => !o && setOtp(null)}>
        <DialogContent title="Confirmez le retrait" description={`Saisissez le code envoyé par SMS au ${otp?.phone ?? ""}.`}>
          <div className="flex flex-col gap-5">
            <OtpInput value={code} autoFocus onChange={(v) => { setCode(v); if (v.length === 6) confirm(v); }} />
            <Button block loading={busy} disabled={code.length !== 6} onClick={() => confirm()}>
              Valider le retrait de {fcfa(amt)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ExportStatement() {
  return (
    <Button variant="secondary" onClick={() => download("/studio/earnings/export", "releve-diginova.csv")}>
      <Download /> Exporter le relevé
    </Button>
  );
}
