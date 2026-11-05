"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, Home, Lightbulb } from "lucide-react";
import { type EstimateInput, calcFunctionPoints, fmtNum } from "@/lib/estimate";
import {
  COMPLEXITY_OPTIONS,
  COVERAGE_OPTIONS,
  DEFAULT_ADDON,
  DOMAIN_OPTIONS,
  KIND_OPTIONS,
  KIND_PRESETS,
  buildAddonDescription,
  buildAddonTitle,
  toEstimateInput,
  type AddonComplexity,
  type AddonDomain,
  type AddonInput,
  type AddonKind,
  type Coverage,
} from "@/lib/addon";
import { Card, Chip, ChoiceTile, Question, inputCls } from "@/components/ui";
import ResultView from "@/components/ResultView";
import AppShell from "@/components/AppShell";

function isAutoTitle(title: string, domain: AddonDomain | "", kinds: AddonKind[]) {
  if (!title.trim()) return true;
  if (title === buildAddonTitle(domain, kinds)) return true;
  return KIND_OPTIONS.some((k) => title === k.title || title.endsWith(` · ${k.label}`));
}

function isAutoDesc(desc: string, kinds: AddonKind[]) {
  if (!desc.trim()) return true;
  const auto = buildAddonDescription(kinds);
  if (desc === auto) return true;
  return kinds.every((id) => {
    const d = KIND_OPTIONS.find((x) => x.value === id)?.desc;
    return !d || desc.includes(d);
  });
}

export default function AddonWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [addon, setAddonState] = useState<AddonInput>(DEFAULT_ADDON);
  const [overrides, setOverrides] = useState<Partial<EstimateInput>>({});
  const setAddon = (p: Partial<AddonInput>) => setAddonState((prev) => ({ ...prev, ...p }));

  const conversion = useMemo(() => toEstimateInput(addon), [addon]);
  const input: EstimateInput = { ...conversion.input, ...overrides, stack: "java" };
  const preview = useMemo(() => {
    const c = toEstimateInput(addon);
    return { counts: c.counts, fp: calcFunctionPoints(c.counts).total };
  }, [addon]);

  const toggleKind = (k: AddonKind) => {
    const on = addon.kinds.includes(k);
    const nextKinds = on ? addon.kinds.filter((x) => x !== k) : [...addon.kinds, k];
    const preset = !on ? KIND_PRESETS[k] : {};
    const fillTitle = isAutoTitle(addon.title, addon.domain, addon.kinds);
    const fillDesc = isAutoDesc(addon.description, addon.kinds);
    setAddon({
      kinds: nextKinds,
      ...preset,
      ...(nextKinds.includes("interface") ? { hasInterface: true } : {}),
      ...(nextKinds.includes("batch") ? { hasBatch: true } : {}),
      ...(fillTitle ? { title: buildAddonTitle(addon.domain, nextKinds) } : {}),
      ...(fillDesc ? { description: buildAddonDescription(nextKinds) } : {}),
    });
  };

  const pickDomain = (d: AddonDomain) => {
    const fillTitle = isAutoTitle(addon.title, addon.domain, addon.kinds);
    setAddon({
      domain: d,
      ...(fillTitle ? { title: buildAddonTitle(d, addon.kinds) } : {}),
    });
  };
  const canNext = addon.domain !== "" && (addon.kinds.length > 0 || addon.description.trim().length > 0);
  const steps = ["1. 범위", "2. 규모", "3. 결과"];

  return (
    <AppShell>
      <header className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                {i > 0 && <span>›</span>}
                <span className={step === i + 1 ? "font-medium text-accent" : ""}>{s}</span>
              </span>
            ))}
          </div>
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground print:hidden">
            <Home className="h-3.5 w-3.5" /> 처음 화면
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-bold">Java+Postgre 추가개발 공수 산정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이미 돌아가는 Java(Spring)·PostgreSQL 시스템 위에 화면·API·리포트·연계·배치를 붙일 때 씁니다. IT·개발 입력이라 커버리지는 기본 보정 없음(100%)이고, 산정 스택은 Java + PostgreSQL입니다.
        </p>
      </header>

      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold">1. 어느 영역인가요?</h2>
            <p className="mt-1 text-sm text-muted-foreground">운영 중인 시스템·업무 영역을 고르세요.</p>
            <div className="choice-grid mt-4">
              {DOMAIN_OPTIONS.map((d) => (
                <ChoiceTile
                  key={d.value}
                  selected={addon.domain === d.value}
                  onClick={() => pickDomain(d.value)}
                  title={d.label}
                  subtitle={`예: ${d.example}`}
                />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold">2. 추가개발 유형을 고르세요 (복수 선택)</h2>
            <p className="mt-1 text-sm text-muted-foreground">여러 유형을 함께 고를 수 있습니다. 고르면 이름·설명이 채워집니다.</p>
            <div className="choice-grid mt-4">
              {KIND_OPTIONS.map((k) => (
                <ChoiceTile
                  key={k.value}
                  selected={addon.kinds.includes(k.value)}
                  onClick={() => toggleKind(k.value)}
                  title={k.label}
                  subtitle={`예: ${k.example}`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {(
                [
                  ["crm", "api", "CRM·API 예시"],
                  ["crm", "interface", "CRM·연계 예시"],
                  ["internal", "workflow", "내부·결재 예시"],
                ] as const
              ).map(([domain, kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  className="btn-ghost py-1.5 text-xs"
                  onClick={() =>
                    setAddon({
                      domain,
                      kinds: [kind],
                      ...KIND_PRESETS[kind],
                      title: buildAddonTitle(domain, [kind]),
                      description: buildAddonDescription([kind]),
                    })
                  }
                >
                  <Lightbulb className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold">3. 요청 이름과 추가 설명</h2>
            <div className="mt-4 grid gap-4">
              <input
                className={inputCls}
                value={addon.title}
                placeholder={buildAddonTitle(addon.domain || "crm", addon.kinds.length ? addon.kinds : ["api"])}
                onChange={(e) => setAddon({ title: e.target.value })}
              />
              <textarea
                className={`${inputCls} min-h-[120px]`}
                value={addon.description}
                placeholder="대상 시스템, 화면·API 수, 연계, DB 변경 여부를 적어 주세요."
                onChange={(e) => setAddon({ description: e.target.value })}
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <button type="button" disabled={!canNext} onClick={() => setStep(2)} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
              다음: 규모 잡기 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Card className="space-y-5">
            <Question no={1} title="이번 요청에 화면·API·잡 등이 대략 몇 개인가요?" hint="엔드포인트·화면·배치 단위로 세세요. 1~30.">
              <input
                type="number"
                min={1}
                max={30}
                className={`${inputCls} max-w-[8rem]`}
                value={addon.objectCount}
                onChange={(e) => setAddon({ objectCount: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
              />
            </Question>

            <Question no={2} title="복잡도는요?">
              <div className="grid gap-2 sm:grid-cols-3">
                {COMPLEXITY_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    desc={o.desc}
                    selected={addon.complexity === o.value}
                    onClick={() => setAddon({ complexity: o.value as AddonComplexity })}
                  />
                ))}
              </div>
            </Question>

            <Question no={3} title="외부 시스템 연계가 포함되나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="없음" selected={!addon.hasInterface} onClick={() => setAddon({ hasInterface: false })} />
                <Chip label="있음" desc="매핑·재처리·모니터링" selected={addon.hasInterface} onClick={() => setAddon({ hasInterface: true })} />
              </div>
            </Question>

            <Question no={4} title="권한·조직(브랜드·매장·부서) 체크가 있나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="간단·거의 없음" selected={!addon.hasAuth} onClick={() => setAddon({ hasAuth: false })} />
                <Chip label="있음" selected={addon.hasAuth} onClick={() => setAddon({ hasAuth: true })} />
              </div>
            </Question>

            <Question no={5} title="배치·스케줄 잡이 포함되나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="없음" selected={!addon.hasBatch} onClick={() => setAddon({ hasBatch: false })} />
                <Chip label="있음" selected={addon.hasBatch} onClick={() => setAddon({ hasBatch: true })} />
              </div>
            </Question>

            <Question no={6} title="모바일·현장에서도 쓰나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="PC 웹만" selected={!addon.mobile} onClick={() => setAddon({ mobile: false })} />
                <Chip label="모바일·현장 단말" selected={addon.mobile} onClick={() => setAddon({ mobile: true })} />
              </div>
            </Question>

            <Question no={7} title="입력 커버리지" hint="현업용이 아니라서 기본은 보정 없음입니다. 빠진 항목이 있을 때만 낮추세요.">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {COVERAGE_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    desc={o.desc}
                    selected={String(addon.coverage) === o.value}
                    onClick={() => setAddon({ coverage: Number(o.value) as Coverage })}
                  />
                ))}
              </div>
            </Question>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> 범위 수정
            </button>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                미리보기: ILF {preview.counts.ilf} · EI {preview.counts.ei} · EO {preview.counts.eo} · 약 {fmtNum(preview.fp, 0)} FP
              </span>
              <button type="button" onClick={() => setStep(3)} className="btn-primary">
                <Calculator className="h-4 w-4" /> 비용 산정하기 <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <ResultView
          channel="addon"
          input={input}
          setInput={(p) => setOverrides((prev) => ({ ...prev, ...p, stack: "java" }))}
          assumptions={conversion.assumptions}
          backLabel="규모 수정"
          onBack={() => setStep(2)}
          onReset={() => {
            setAddonState(DEFAULT_ADDON);
            setOverrides({});
            setStep(1);
          }}
        />
      )}
    </AppShell>
  );
}
