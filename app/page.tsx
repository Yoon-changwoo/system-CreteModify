import Link from "next/link";
import { ArrowRight, Boxes, Code2, FolderSearch, MessageCircleQuestion, Puzzle, SlidersHorizontal } from "lucide-react";
import { RATE_YEAR } from "@/lib/estimate";
import AppShell from "@/components/AppShell";
import SourcesPanel from "@/components/SourcesPanel";

export default function HomePage() {
  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">시스템별 구축견적 산정 시스템</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {RATE_YEAR}년 국내 공공 표준과 민간 SI 시세로 개발 공수를 가늠합니다.{" "}
          <strong className="font-semibold text-foreground">신규 구축</strong>인지,{" "}
          <strong className="font-semibold text-foreground">기존 시스템 추가개발</strong>
          (SAP CBO / Java+Postgre)인지 고르세요. 보안·인프라·라이선스는 제외합니다.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border-2 border-accent/40 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-accent">
            <Boxes className="h-5 w-5" />
            <span className="text-xs font-semibold">1. 신규 시스템</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold">새로 만드는 공수 산정</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            SAP ERP·SCM·FCM뿐 아니라 캠페인·브랜드/통합 멤버십·채널서버(카카오 브랜드톡) 등 CRM 계열 신규 구축도 포함합니다.
          </p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link href="/easy" className="group flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-accent">
                <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-medium">현업 입력</span>
                  <span className="text-xs text-muted-foreground">ERP·SCM·FCM·캠페인·멤버십·채널서버</span>
                </span>
                <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent" />
              </Link>
            </li>
            <li>
              <Link href="/expert" className="group flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-accent">
                <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">IT 담당자</span>
                  <span className="text-xs text-muted-foreground">ILF·EI 등 기능 개수 직접 입력</span>
                </span>
                <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent" />
              </Link>
            </li>
            <li>
              <Link href="/source" className="group flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-accent">
                <FolderSearch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">소스 분석</span>
                  <span className="text-xs text-muted-foreground">폴더·경로로 규모 검증</span>
                </span>
                <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent" />
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Puzzle className="h-5 w-5" />
            <span className="text-xs font-semibold">2. 추가개발</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold">기존 시스템에 업무 얹기</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            운영 중인 SAP 또는 Java+PostgreSQL 위에 화면·리포트·연계·배치 등을 붙일 때 씁니다. IT·개발 입력이라 커버리지는 기본 100%입니다.
          </p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link href="/cbo" className="group flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-accent">
                <Puzzle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">SAP CBO</span>
                  <span className="text-xs text-muted-foreground">ALV·BADI·IDoc·배치 · ABAP</span>
                </span>
                <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent" />
              </Link>
            </li>
            <li>
              <Link href="/addon" className="group flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-accent">
                <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-medium">Java + PostgreSQL</span>
                  <span className="text-xs text-muted-foreground">화면·API·연계·배치·스키마</span>
                </span>
                <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent" />
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-8">
        <SourcesPanel />
      </div>
    </AppShell>
  );
}
