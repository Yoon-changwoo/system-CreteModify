import { COST_SOURCES, SAP_MARKET_NOTE, STACK_NOTE } from "@/lib/sources";

export default function SourcesPanel({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-xl border-2 border-accent/30 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">산정 근거 · 출처 (시장가 비교용)</p>
          <h3 className="mt-1 text-base font-bold">세 기준을 나란히 두고 이노플 제안가격이 어디에 있는지 봅니다</h3>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">{STACK_NOTE}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {COST_SOURCES.map((s) => (
          <article key={s.id} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">
                {s.no} {s.title}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.id === "market" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                {s.badge}
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              <div>
                <dt className="text-muted-foreground">발간</dt>
                <dd className="font-medium">
                  {s.org}
                  <br />
                  {s.doc}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">적용 시점</dt>
                <dd>{s.edition}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">핵심 수치</dt>
                <dd className="font-medium text-foreground">{s.key}</dd>
              </div>
              {!compact && (
                <>
                  <div>
                    <dt className="text-muted-foreground">산식 요지</dt>
                    <dd>{s.extra}</dd>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1.5 text-foreground">{s.use}</div>
                </>
              )}
            </dl>
          </article>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">
            {SAP_MARKET_NOTE.title} · {SAP_MARKET_NOTE.badge}
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{SAP_MARKET_NOTE.org}</span>
        </div>
        <p className="mt-1 font-medium">{SAP_MARKET_NOTE.key}</p>
        <p className="mt-1 text-amber-900">{SAP_MARKET_NOTE.extra}</p>
      </div>
    </section>
  );
}
