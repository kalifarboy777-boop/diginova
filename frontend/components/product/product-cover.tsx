import { useId } from "react";
import { cn } from "@/lib/cn";
import type { CoverType } from "@/lib/types";

/**
 * Visuels stylisés du Figma (« Visuel/chart », « grid », « chat », « sheet », « doc », « notion », « book », « brand »).
 * Géométrie exacte du cadre 302 × 227 (design/figma-cache/covers.spec.txt), mise à l'échelle par SVG.
 */
const BG: Record<CoverType, string> = {
  chart: "#EEEDFF",
  grid: "#FCE7F3",
  chat: "#E0F2FE",
  sheet: "#DCFCE7",
  doc: "#E0E7FF",
  notion: "#F3F4F6",
  book: "#FEF3C7",
  brand: "#CCFBF1",
};
const ACCENT: Record<CoverType, string> = {
  chart: "#635BFF",
  grid: "#DB2777",
  chat: "#0284C7",
  sheet: "#16A34A",
  doc: "#4338CA",
  notion: "#374151",
  book: "#FFFFFF",
  brand: "#0D9488",
};

export const coverBackground = (t: CoverType) => BG[t] ?? BG.doc;

function Content({ type }: { type: CoverType }) {
  const a = ACCENT[type];
  const grey = "#E5E7EB";
  const line = (x: number, y: number, w: number, fill = grey, op = 1) => <rect x={x} y={y} width={w} height={5.4} rx={2.7} fill={fill} opacity={op} />;
  switch (type) {
    case "chart":
      return (
        <>
          {[
            [74.4, 142.7, 59.2, 0.35],
            [101.6, 109.8, 92.1, 0.48],
            [128.8, 129.6, 72.4, 0.61],
            [156, 76.9, 125, 0.74],
            [183.1, 96.7, 105.3, 0.87],
          ].map(([x, y, h, o]) => (
            <rect key={x} x={x} y={y} width={20.7} height={h} rx={3.2} fill={a} opacity={o} />
          ))}
        </>
      );
    case "grid":
      return (
        <>
          {[
            [72.3, 70.4, 0.9],
            [143.5, 70.4, 0.45],
            [72.3, 139.4, 0.6],
            [143.5, 139.4, 0.25],
          ].map(([x, y, o]) => (
            <rect key={`${x}${y}`} x={x} y={y} width={64.7} height={62.6} rx={6.5} fill={a} opacity={o} />
          ))}
        </>
      );
    case "chat":
      return (
        <>
          <rect x={72.3} y={70.4} width={101.9} height={26.4} rx={8.6} fill="#F3F4F6" />
          <rect x={126.6} y={103.3} width={81.5} height={26.4} rx={8.6} fill={a} opacity={0.85} />
          <rect x={72.3} y={136.2} width={108.7} height={26.4} rx={8.6} fill="#F3F4F6" />
          <rect x={140.2} y={169} width={67.9} height={26.4} rx={8.6} fill={a} opacity={0.85} />
        </>
      );
    case "sheet":
      return (
        <>
          {[0, 1, 2, 3, 4, 5].flatMap((r) =>
            [72.3, 117.6, 162.9].map((x) => <rect key={`${r}-${x}`} x={x} y={70.4 + r * 21.92} width={42.1} height={18.7} rx={2.2} fill={r === 0 ? a : "#DCFCE7"} opacity={r === 0 ? 0.8 : 1} />),
          )}
        </>
      );
    case "doc":
    case "book":
      return (
        <>
          {[
            [70.4, 135.9],
            [89.2, 122.3],
            [108, 129.1],
            [126.8, 95.1],
            [145.5, 135.9],
            [164.3, 115.5],
            [183.1, 67.9],
          ].map(([y, w]) => (
            <g key={y}>{line(72.3, y, w, type === "book" ? "#FFFFFF" : grey, type === "book" ? 0.55 : 1)}</g>
          ))}
        </>
      );
    case "notion":
      return (
        <>
          {[
            [70.4, 94.9, true],
            [92.3, 71.2, true],
            [114.2, 106.8, true],
            [136.2, 83.1, false],
            [158.1, 100.8, false],
            [180, 59.3, false],
          ].map(([y, w, done]) => (
            <g key={String(y)}>
              <rect x={72.3} y={y as number} width={9.7} height={9.7} rx={2.2} fill={done ? a : "#FFFFFF"} stroke={a} strokeWidth={1.4} />
              {line(89.5, (y as number) + 2.1, w as number)}
            </g>
          ))}
        </>
      );
    case "brand":
      return (
        <>
          <circle cx={111.8} cy={109.9} r={39.5} fill={a} />
          <rect x={162} y={79} width={46.2} height={6.5} rx={3.2} fill={grey} />
          <rect x={162} y={94.1} width={27.7} height={6.5} rx={3.2} fill={grey} />
          <rect x={72.3} y={165.1} width={39.9} height={36.8} rx={4.3} fill={a} />
          <rect x={117.6} y={165.1} width={39.9} height={36.8} rx={4.3} fill="#5EEAD4" />
          <rect x={162.9} y={165.1} width={39.9} height={36.8} rx={4.3} fill="#111827" />
        </>
      );
  }
}

export function ProductCover({ type = "doc", className, title, rounded = true }: { type?: CoverType; className?: string; title?: string; rounded?: boolean }) {
  const id = useId().replace(/:/g, "");
  const t: CoverType = BG[type] ? type : "doc";
  const paper = t === "book" ? "#D97706" : "#FFFFFF";
  const head = t === "book" ? "#FFFFFF" : ACCENT[t];
  return (
    <svg
      viewBox="0 0 302 227"
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-full w-full", rounded && "rounded-md", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <filter id={`s${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8.6" stdDeviation="10.8" floodColor="#121733" floodOpacity="0.14" />
        </filter>
        <clipPath id={`c${id}`}>
          <rect width="302" height="227" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="302" height="227" fill={BG[t]} />
        <rect x={98.1} y={40.2} width={161.8} height={189.8} rx={8.6} fill="#FFFFFF" opacity={0.55} />
        <rect x={59.3} y={25.1} width={161.8} height={189.8} rx={8.6} fill={paper} filter={`url(#s${id})`} />
        <rect x={72.3} y={38} width={74.7} height={8.6} rx={4.3} fill={head} />
        <rect x={72.3} y={53.1} width={108.7} height={5.4} rx={2.7} fill={t === "book" ? "#FFFFFF" : "#E5E7EB"} opacity={t === "book" ? 0.5 : 1} />
        <Content type={t} />
      </g>
    </svg>
  );
}
