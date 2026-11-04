"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, Home, Lightbulb, Sparkles } from "lucide-react";
import { type EstimateInput, calcFunctionPoints, fmtNum } from "@/lib/estimate";
import {
  AGGREGATION_OPTIONS,
  APPROVAL_OPTIONS,
  AUTOMATION_OPTIONS,
  COVERAGE_OPTIONS,
  CUSTOMER_OPTIONS,
  DATA_KIND_OPTIONS,
  DEFAULT_EASY,
  INTEGRATION_OPTIONS,
  KIND_OPTIONS,
  KIND_PRESETS,
  NOTIFY_OPTIONS,
  REPORT_OPTIONS,
  SALES_OPTIONS,
  SCALE_OPTIONS,
  SPEED_OPTIONS,
  USER_GROUP_OPTIONS,
  VOLUME_OPTIONS,
  applyHints,
  toEstimateInput,
  type AutomationKey,
  type Coverage,
  type EasyInput,
  type SystemKind,
} from "@/lib/easy";
import { Card, Chip, Question, inputCls } from "@/components/ui";
import ResultView from "@/components/ResultView";
import AppShell from "@/components/AppShell";

const SAMPLE_TITLES = KIND_OPTIONS.map((k) => k.title).filter(Boolean);
const SAMPLE_DESCS = KIND_OPTIONS.map((k) => k.desc).filter(Boolean);

const toggle = <T extends string>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/* ------------------------------------------------------------------ */
/* 1단계: 설명                                                           */
/* ------------------------------------------------------------------ */

function StepDescribe({ easy, setEasy, onNext }: { easy: EasyInput; setEasy: (p: Partial<EasyInput>) => void; onNext: () => void }) {
  const pickKind = (k: SystemKind, forceFill = false) => {
    const opt = KIND_OPTIONS.find((x) => x.value === k);
    if (!opt) return;
    const fillTitle = forceFill || !easy.title.trim() || SAMPLE_TITLES.includes(easy.title);
    const fillDesc = forceFill || !easy.description.trim() || SAMPLE_DESCS.includes(easy.description);
    setEasy({
      kind: k,
      ...KIND_PRESETS[k],
      ...(fillTitle ? { title: opt.title } : {}),
      ...(fillDesc ? { description: opt.desc } : {}),
    });
  };
  const canNext = easy.kind !== "" || easy.description.trim().length > 0;
  const selected = KIND_OPTIONS.find((k) => k.value === easy.kind);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold">1. 가장 비슷한 유형을 하나 골라 주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">유형을 고르면 시스템 이름과 기본 설명이 채워집니다. 다음에서 원하는 기능을 더 적을 수 있습니다.</p>
        <div className="choice-grid mt-4">
          {KIND_OPTIONS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => pickKind(k.value)}
              className={`rounded-lg border p-4 text-left transition ${easy.kind === k.value ? "border-accent bg-blue-50" : "border-border bg-white hover:border-accent/50"}`}
            >
              <div className="text-sm font-medium">{k.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">예: {k.example}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => pickKind("erp", true)}>
            <Lightbulb className="h-3.5 w-3.5" /> ERP 예시
          </button>
          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => pickKind("campaign", true)}>
            <Lightbulb className="h-3.5 w-3.5" /> 캠페인 예시
          </button>
          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => pickKind("brand_membership", true)}>
            <Lightbulb className="h-3.5 w-3.5" /> 브랜드 멤버십
          </button>
          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => pickKind("unified_membership", true)}>
            <Lightbulb className="h-3.5 w-3.5" /> 통합 멤버십
          </button>
          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => pickKind("channel", true)}>
            <Lightbulb className="h-3.5 w-3.5" /> 채널서버 예시
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">2. 시스템 이름과 추가하고 싶은 기능을 적어 주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          위 유형에 없는 기능, 특정 규칙, 고객 수·매출 규모 등을 추가로 적으세요. 적은 내용에서 단서를 찾아 다음 질문을 미리 채워 드립니다.
        </p>
        <div className="mt-4 grid gap-4">
          <input
            className={inputCls}
            value={easy.title}
            placeholder={selected?.title || "시스템 이름 (예: SCM 물류·창고 관리)"}
            onChange={(e) => setEasy({ title: e.target.value })}
          />
          <div>
            <textarea
              className={`${inputCls} min-h-[140px]`}
              value={easy.description}
              placeholder={selected?.desc || "유형을 고르면 기본 설명이 채워집니다. 없는 기능이나 고객 수·매출 규모를 이어서 적어 주세요."}
              onChange={(e) => setEasy({ description: e.target.value })}
            />
            <div className="mt-1.5 text-xs text-muted-foreground">{easy.description.length}자</div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <button type="button" disabled={!canNext} onClick={onNext} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
          다음: 몇 가지만 더 여쭤볼게요 <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2단계: 질문                                                           */
/* ------------------------------------------------------------------ */

function StepQuestions({
  easy,
  setEasy,
  found,
  onBack,
  onNext,
}: {
  easy: EasyInput;
  setEasy: (p: Partial<EasyInput>) => void;
  found: string[];
  onBack: () => void;
  onNext: () => void;
}) {
  const preview = useMemo(() => {
    const c = toEstimateInput(easy);
    return { counts: c.counts, fp: calcFunctionPoints(c.counts).total };
  }, [easy]);
  const fnCount = preview.counts.ei + preview.counts.eo + preview.counts.eq;

  return (
    <div className="space-y-6">
      {found.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <div className="font-medium">설명에서 이런 내용을 찾아 미리 체크해 두었습니다</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {found.map((f) => (
                <span key={f} className="rounded-full border border-accent/40 bg-background px-2 py-0.5 text-xs">{f}</span>
              ))}
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">틀린 것이 있으면 아래에서 고쳐 주세요.</div>
          </div>
        </div>
      )}

      <Card className="space-y-5">
        <Question no={1} title="누가 사용하나요?" hint="해당하는 것을 모두 고르세요. 사용자 종류가 많을수록 화면과 권한이 늘어납니다.">
          <div className="grid gap-2 sm:grid-cols-2">
            {USER_GROUP_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.userGroups.includes(o.value)} onClick={() => setEasy({ userGroups: toggle(easy.userGroups, o.value) })} />
            ))}
          </div>
        </Question>

        <Question no={2} title="시스템이 저장하고 관리하는 정보는 무엇인가요?" hint="엑셀로 관리한다면 '시트 하나가 한 종류'라고 생각하면 됩니다. 모두 고르세요.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DATA_KIND_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} selected={easy.dataKinds.includes(o.value)} onClick={() => setEasy({ dataKinds: toggle(easy.dataKinds, o.value) })} />
            ))}
          </div>
          <input
            className={`${inputCls} mt-2`}
            value={easy.customData}
            placeholder="목록에 없는 정보가 있으면 쉼표로 구분해 적어 주세요 (예: 차량, 주차권)"
            onChange={(e) => setEasy({ customData: e.target.value })}
          />
        </Question>

        <Question no={3} title="고객(소비자) 정보를 몇 명이나 다루나요?" hint="임직원이 아닌 외부 고객·회원 수. 고객 정보가 있으면 개인정보 보호 요구가 함께 반영됩니다.">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {CUSTOMER_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.customerScale === o.value} onClick={() => setEasy({ customerScale: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={4} title="시스템에서 다루는 매출(거래) 데이터 규모는요?" hint="연간 매출 기준. 거래 상세를 보관·집계하는 범위를 가늠합니다.">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {SALES_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.salesScale === o.value} onClick={() => setEasy({ salesScale: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={5} title="누군가의 승인(결재)을 거쳐야 하나요?">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {APPROVAL_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.approval === o.value} onClick={() => setEasy({ approval: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={6} title="처리 결과를 담당자(임직원)에게 알려줘야 하나요?" hint="메일·메신저 알림. 은행·WMS 등 시스템 연계는 Q11에서 고르세요.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {NOTIFY_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.notify === o.value} onClick={() => setEasy({ notify: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={7} title="통계나 리포트가 필요한가요?" hint="가장 복잡한 것 하나만 고르세요.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {REPORT_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.report === o.value} onClick={() => setEasy({ report: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={8} title="집계(합산) 작업이 얼마나 무거운가요?" hint="예: 650만 고객 24개월 매출을 브랜드·상품별로 집계, 또는 플랜트·자재별 재고·원가 집계 → '무거움'">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {AGGREGATION_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.aggregation === o.value} onClick={() => setEasy({ aggregation: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={9} title="시스템이 스스로 움직여야 하는 일이 있나요?" hint="해당하는 것을 모두 고르세요. 실시간 액션은 설계·테스트 비중이 큽니다.">
          <div className="grid gap-2 sm:grid-cols-2">
            {AUTOMATION_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.automation.includes(o.value)} onClick={() => setEasy({ automation: toggle<AutomationKey>(easy.automation, o.value) })} />
            ))}
          </div>
        </Question>

        <Question no={10} title="파일(사진, 문서)을 첨부해야 하나요?">
          <div className="grid gap-2 sm:grid-cols-2">
            <Chip label="아니요" selected={!easy.attachments} onClick={() => setEasy({ attachments: false })} />
            <Chip label="네, 첨부가 필요합니다" desc="증빙, 견적서, 사진 등" selected={easy.attachments} onClick={() => setEasy({ attachments: true })} />
          </div>
        </Question>

        <Question no={11} title="다른 시스템과 연결되어야 하나요?" hint="모두 고르세요. 채널서버·POS·몰·SAP ERP·WMS·은행 연계는 인터페이스 설계가 커져 비용이 올라갑니다.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATION_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.heavy ? `${o.label} ★` : o.label} desc={o.desc} selected={easy.integrations.includes(o.value)} onClick={() => setEasy({ integrations: toggle(easy.integrations, o.value) })} />
            ))}
          </div>
        </Question>

        <Question no={12} title="어디서 사용하나요?">
          <div className="grid gap-2 sm:grid-cols-2">
            <Chip label="사무실 PC에서만" selected={!easy.mobile} onClick={() => setEasy({ mobile: false })} />
            <Chip label="PC와 스마트폰 모두" desc="현장·외근 중 사용" selected={easy.mobile} onClick={() => setEasy({ mobile: true })} />
          </div>
        </Question>

        <Question no={13} title="임직원 사용자는 몇 명 정도인가요?">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SCALE_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.userScale === o.value} onClick={() => setEasy({ userScale: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={14} title="데이터가 얼마나 쌓이나요? (3년 기준)" hint="모르면 고객 수·매출 규모로 자동 보정되니 대략만 고르세요.">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {VOLUME_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.dataVolume === o.value} onClick={() => setEasy({ dataVolume: o.value })} />
            ))}
          </div>
        </Question>

        <Question no={15} title="속도가 특별히 중요한가요?">
          <div className="grid gap-2 sm:grid-cols-2">
            {SPEED_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} desc={o.desc} selected={easy.speed === o.value} onClick={() => setEasy({ speed: o.value })} />
            ))}
          </div>
        </Question>

        <Question
          no={16}
          title="적어 주신 기능이 전체의 몇 % 정도일까요?"
          hint="기본값은 큰 그림만(60%)입니다. 주요 기능까지 적었다면 70%를 고르세요. 빠진 공통·예외·운영 기능만큼 공수를 올립니다."
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {COVERAGE_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                desc={o.desc}
                selected={String(easy.coverage) === o.value}
                onClick={() => setEasy({ coverage: Number(o.value) as Coverage })}
              />
            ))}
          </div>
        </Question>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> 설명 수정
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            지금 답변 기준: 데이터 {preview.counts.ilf + preview.counts.eif}종 · 기능 {fnCount}개 · 약 {fmtNum(preview.fp, 0)} FP
          </span>
          <button type="button" onClick={onNext} className="btn-primary">
            <Calculator className="h-4 w-4" /> 비용 산정하기 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 루트                                                                 */
/* ------------------------------------------------------------------ */

export default function EasyWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [easy, setEasyState] = useState<EasyInput>(DEFAULT_EASY);
  const [found, setFound] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Partial<EstimateInput>>({});
  const setEasy = (p: Partial<EasyInput>) => setEasyState((prev) => ({ ...prev, ...p }));

  const conversion = useMemo(() => toEstimateInput(easy), [easy]);
  const input: EstimateInput = { ...conversion.input, ...overrides };

  const goQuestions = () => {
    const { result, found: f } = applyHints(easy);
    setEasyState(result);
    setFound(f);
    setStep(2);
  };

  const steps = ["1. 설명", "2. 질문", "3. 결과"];

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
          <h1 className="mt-2 text-2xl font-bold">신규 시스템 구축 공수 산정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SAP ERP·SCM·FCM과 캠페인·브랜드/통합 멤버십·채널서버(카카오 브랜드톡) 등 CRM 유형을 고르면 이름과 설명이 채워집니다. 없는 기능을 더 적고 질문에 답하면 공공 표준과 시장 시세로 비교합니다. 입력은 전체의 약 60%(큰 그림)로 보정합니다.
          </p>
        </header>

        {step === 1 && <StepDescribe easy={easy} setEasy={setEasy} onNext={goQuestions} />}
        {step === 2 && <StepQuestions easy={easy} setEasy={setEasy} found={found} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && (
          <ResultView
            input={input}
            setInput={(p) => setOverrides((prev) => ({ ...prev, ...p }))}
            assumptions={conversion.assumptions}
            backLabel="답변 수정"
            onBack={() => setStep(2)}
            onReset={() => {
              setEasyState(DEFAULT_EASY);
              setOverrides({});
              setFound([]);
              setStep(1);
            }}
          />
        )}
    </AppShell>
  );
}
