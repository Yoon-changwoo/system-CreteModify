"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AttributionChip } from "./AttributionMark";

type NavItem = { href: string; label: string };

const HOME: NavItem = { href: "/", label: "처음" };
const NEW_BUILD: NavItem[] = [
  { href: "/easy", label: "현업" },
  { href: "/expert", label: "IT" },
  { href: "/source", label: "소스" },
];
const ADDON: NavItem[] = [
  { href: "/cbo", label: "SAP CBO" },
  { href: "/addon", label: "Java" },
];
const EXTRA: NavItem[] = [{ href: "/usage", label: "사용량" }];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link href={item.href} className={`rounded-md px-2.5 py-1.5 ${on ? "bg-white/15 font-medium" : "hover:bg-white/10"}`}>
      {item.label}
    </Link>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-white/5 px-1.5 py-1">
      <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">{label}</span>
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-header print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href="/" className="text-sm font-semibold tracking-tight md:text-base">
              시스템별 구축견적 산정 시스템
            </Link>
            <AttributionChip />
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <NavLink item={HOME} pathname={pathname} />
            <NavGroup label="신규" items={NEW_BUILD} pathname={pathname} />
            <NavGroup label="추가개발" items={ADDON} pathname={pathname} />
            {EXTRA.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
