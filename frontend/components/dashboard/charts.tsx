"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { num } from "@/lib/format";

const axis = { fontSize: 12, fill: "var(--text-tertiary)", fontFamily: "var(--font-inter)" };
const k = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

function Tip({ active, payload, label, unit = "F" }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-default bg-bg-surface px-3 py-2 shadow-float">
      <p className="text-caption text-text-tertiary">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-label-sm text-text-primary">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {payload.length > 1 && <span className="text-text-secondary">{p.name}</span>}
          {num(p.value)} {unit}
        </p>
      ))}
    </div>
  );
}

/** Barres d'une série (revenus) : barres claires, la dernière (période en cours) en couleur de marque. */
export function RevenueBars({ data, height = 220 }: { data: { label: string; value: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={`Revenus : ${data.map((d) => `${d.label} ${num(d.value)} F`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -8 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border-default)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} tick={axis} tickFormatter={k} width={44} />
          <Tooltip content={<Tip />} cursor={{ fill: "var(--bg-subtle)" }} />
          <Bar dataKey="value" name="Revenus" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? "var(--brand-primary)" : "var(--brand-subtle)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Deux courbes (écran 50) : ventes DigiNova (aire violette) et ventes créateurs (ligne verte). */
export function DualRevenue({ data, height = 220 }: { data: { label: string; diginova: number; creators: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="dn-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#635BFF" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#635BFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border-default)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} tick={axis} tickFormatter={k} width={44} />
          <Tooltip content={<Tip />} cursor={{ stroke: "var(--border-strong)" }} />
          <Area type="linear" dataKey="diginova" name="Ventes DigiNova" stroke="#635BFF" strokeWidth={2} fill="url(#dn-area)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--bg-surface)" }} />
          <Area type="linear" dataKey="creators" name="Ventes créateurs" stroke="#16A34A" strokeWidth={2} fill="transparent" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--bg-surface)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} /> {i.label}
        </span>
      ))}
    </div>
  );
}
