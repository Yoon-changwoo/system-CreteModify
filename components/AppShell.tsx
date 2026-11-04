"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "처음" },
  { href: "/easy", label: "신규·현업" },
  { href: "/expert", label: "신규·IT" },
  { href: "/source", label: "소스 분석" },
  { href: "/cbo", label: "SAP CBO" },
  { href: "/usage", label: "사용량" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-header print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight md:text-base">
            시스템별 구축견적 산정 시스템
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((n) => {
              const on = pathname === n.href || pathname.startsWith(`${n.href}/`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-md px-3 py-1.5 ${on ? "bg-white/15 font-medium" : "hover:bg-white/10"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
