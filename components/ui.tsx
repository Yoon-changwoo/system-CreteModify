"use client";

import { Check } from "lucide-react";
import type { Level } from "@/lib/estimate";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none ring-accent/20 focus:border-accent focus:ring-2";

export function NumberInput({ value, onChange, min = 0, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <input
      type="number"
      className={inputCls}
      value={Number.isFinite(value) ? value : 0}
      min={min}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/** 금액 입력 — 화면에는 73,014,524원 형태로 표시 */
export function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const display = Number.isFinite(value) ? Math.round(value).toLocaleString("ko-KR") : "0";
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        className={`${inputCls} pr-10`}
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          onChange(raw ? Number(raw) : 0);
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
    </div>
  );
}

export function LevelSelect({ value, labels, onChange }: { value: Level; labels: string[]; onChange: (v: Level) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(Number(e.target.value) as Level)}>
      {labels.map((l, i) => (
        <option key={i} value={i + 1}>
          {i + 1}단계 · {l}
        </option>
      ))}
    </select>
  );
}

export function Stat({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-accent bg-blue-50" : "border-border bg-background"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** 유형 선택 타일 (현업·CBO 등) */
export function ChoiceTile({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        selected ? "border-accent bg-blue-50" : "border-border bg-white hover:border-accent/50"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
    </button>
  );
}

/** 선택형 칩 버튼 (단일/다중 선택 공용) */
export function Chip({ selected, onClick, label, desc }: { selected: boolean; onClick: () => void; label: string; desc?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
        selected ? "border-accent bg-blue-50 shadow-sm" : "border-border bg-white hover:border-accent/50"
      }`}
    >
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-accent bg-accent text-white" : "border-muted-foreground"}`}>
        {selected && <Check className="h-3 w-3" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </span>
    </button>
  );
}

/** 질문 블록: 번호 + 질문 + 보조설명 + 선택지 */
export function Question({ no, title, hint, children }: { no: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-accent">Q{no}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
