"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";
import { CHANNEL_LABEL, type UsageStats } from "@/lib/usage";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui";

function fmtAt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export default function UsagePanel() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/usage/stats?limit=80", { cache: "no-store" });
      if (!res.ok) throw new Error("통계를 불러오지 못했습니다.");
      setStats((await res.json()) as UsageStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "통계를 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <header className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>테스트용 · 로그인 전 IP(해시) 기준</span>
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-3.5 w-3.5" /> 처음 화면
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">견적 산출 사용량</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              결과 화면이 열릴 때 1건으로 셉니다. 같은 브라우저 세션에서 같은 결과를 새로고침해도 중복 집계하지 않습니다. 설문은 동일 사용자(IP) 기준 10·50·100건 도달 시에만 표시됩니다.
            </p>
          </div>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> 새로고침
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="space-y-6">
          {!stats.durable && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{stats.note}</p>
          )}
          {stats.durable && <p className="text-xs text-muted-foreground">{stats.note}</p>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="text-xs text-muted-foreground">총 견적 건수</div>
              <div className="mt-1 text-2xl font-bold">{stats.total.toLocaleString()}건</div>
            </Card>
            {Object.entries(stats.byChannel).map(([name, n]) => (
              <Card key={name}>
                <div className="text-xs text-muted-foreground">{name}</div>
                <div className="mt-1 text-2xl font-bold">{n.toLocaleString()}건</div>
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="text-sm font-semibold">접속 IP별 (마스킹)</h2>
            <p className="mt-1 text-xs text-muted-foreground">실제 IP는 저장하지 않고 해시 키로만 구분합니다.</p>
            {stats.byVisitor.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">아직 기록이 없습니다. 견적을 한 번 산출해 보세요.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">IP 힌트</th>
                      <th className="py-2 pr-3">방문자 키</th>
                      <th className="py-2 pr-3 text-right">건수</th>
                      <th className="py-2">최근</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byVisitor.map((v) => (
                      <tr key={v.visitorKey} className="border-t border-border">
                        <td className="py-2 pr-3 font-medium">{v.ipHint}</td>
                        <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{v.visitorKey}</td>
                        <td className="py-2 pr-3 text-right">{v.count}</td>
                        <td className="py-2 text-xs text-muted-foreground">{fmtAt(v.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">최근 산출</h2>
            {stats.recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">기록 없음</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {stats.recent.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <div>
                      <span className="font-medium">{e.title || "(이름 없음)"}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {CHANNEL_LABEL[e.channel]} · {e.stack === "sap" ? "SAP" : "Java"} · {e.fp.toLocaleString()} FP · {e.ipHint}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmtAt(e.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">만족도 설문 응답 ({stats.surveys.length}건)</h2>
            <p className="mt-1 text-xs text-muted-foreground">동일 사용자(IP)가 10·50·100건 도달 시 팝업으로 수집합니다.</p>
            {stats.surveys.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">아직 제출된 설문이 없습니다.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {stats.surveys.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {s.milestone}건 구간 · 만족도 {s.satisfaction}/5 · 추천{" "}
                        {s.recommend === "yes" ? "함" : s.recommend === "no" ? "안 함" : "보통"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.ipHint} · {fmtAt(s.at)}
                      </span>
                    </div>
                    {s.satisfiedPoints.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">만족: {s.satisfiedPoints.join(" · ")}</p>
                    )}
                    {s.dissatisfiedReasons.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">불만족: {s.dissatisfiedReasons.join(" · ")}</p>
                    )}
                    {s.neededFeatures.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">필요 기능: {s.neededFeatures.join(" · ")}</p>
                    )}
                    {s.comment && <p className="mt-2 text-sm">{s.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
