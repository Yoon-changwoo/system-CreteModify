"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  DISSATISFIED_OPTIONS,
  NEEDED_FEATURE_OPTIONS,
  SATISFIED_OPTIONS,
  type SurveyMilestone,
} from "@/lib/usage";

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function OptionChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-left text-[13px] leading-snug transition-colors ${
        selected ? "border-accent bg-blue-50 font-medium text-accent" : "border-border bg-white hover:border-accent/40"
      }`}
    >
      {label}
    </button>
  );
}

interface Props {
  milestone: SurveyMilestone;
  count: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SurveyModal({ milestone, count, onClose, onSubmitted }: Props) {
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [satisfiedPoints, setSatisfied] = useState<string[]>([]);
  const [dissatisfiedReasons, setDissatisfied] = useState<string[]>([]);
  const [neededFeatures, setNeeded] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<"yes" | "no" | "maybe" | "">("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!satisfaction) {
      setError("전체 만족도를 선택해 주세요.");
      return;
    }
    if (!recommend) {
      setError("추천 의향을 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/usage/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone,
          satisfaction,
          satisfiedPoints,
          dissatisfiedReasons,
          neededFeatures,
          recommend,
          comment,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "제출에 실패했습니다.");
        return;
      }
      onSubmitted();
    } catch {
      setError("제출에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4 print:hidden" role="dialog" aria-modal="true">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">사용 만족도 설문</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              견적 {count.toLocaleString()}건 산출 ({milestone}건 구간) · 복수 선택은 해당 항목을 눌러 주세요.
            </p>
          </div>
          <button type="button" className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="space-y-3">
            <section className="space-y-1.5">
              <h3 className="text-sm font-medium">1. 전체 만족도</h3>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSatisfaction(n)}
                    className={`rounded-md border py-2 text-sm ${satisfaction === n ? "border-accent bg-blue-50 font-semibold text-accent" : "border-border hover:border-accent/50"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">1 매우 불만족 · 3 보통 · 5 매우 만족</p>
            </section>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <section className="space-y-1">
                <h3 className="text-sm font-medium">2. 만족하는 점</h3>
                <div className="grid gap-1">
                  {SATISFIED_OPTIONS.map((o) => (
                    <OptionChip key={o} label={o} selected={satisfiedPoints.includes(o)} onClick={() => setSatisfied(toggle(satisfiedPoints, o))} />
                  ))}
                </div>
              </section>

              <section className="space-y-1">
                <h3 className="text-sm font-medium">3. 불만족 이유</h3>
                <div className="grid gap-1">
                  {DISSATISFIED_OPTIONS.map((o) => (
                    <OptionChip key={o} label={o} selected={dissatisfiedReasons.includes(o)} onClick={() => setDissatisfied(toggle(dissatisfiedReasons, o))} />
                  ))}
                </div>
              </section>
            </div>

            <section className="space-y-1">
              <h3 className="text-sm font-medium">4. 추가되면 좋을 기능</h3>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {NEEDED_FEATURE_OPTIONS.map((o) => (
                  <OptionChip key={o} label={o} selected={neededFeatures.includes(o)} onClick={() => setNeeded(toggle(neededFeatures, o))} />
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <section className="space-y-1.5">
                <h3 className="text-sm font-medium">5. 동료에게 추천하시겠습니까?</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["yes", "추천함"],
                      ["maybe", "보통"],
                      ["no", "안 함"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRecommend(v)}
                      className={`rounded-md border px-2 py-2 text-sm ${recommend === v ? "border-accent bg-blue-50 font-semibold text-accent" : "border-border hover:border-accent/50"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-medium">6. 기타 의견</h3>
                <textarea
                  className="!min-h-[40px] w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  rows={1}
                  value={comment}
                  placeholder="불편했던 점, 필요한 기능, 업무 사례 등"
                  onChange={(e) => setComment(e.target.value)}
                />
              </section>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2.5">
          {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>
              나중에
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void submit()}>
              {busy ? "제출 중…" : "제출하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
