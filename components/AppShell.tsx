"use client";

import { useEffect, useState } from "react";
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

export const USAGE_ADMIN_KEY = "usage-admin";

function isOn(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = isOn(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`inline-flex h-9 items-center rounded-md px-3 text-sm transition ${
        on ? "bg-white font-semibold text-[#12355b] shadow-sm" : "text-white/90 hover:bg-white/15"
      }`}
    >
      {item.label}
    </Link>
  );
}

function NavGroup({
  label,
  href,
  items,
  pathname,
}: {
  label: string;
  href: string;
  items: NavItem[];
  pathname: string;
}) {
  const active = items.some((i) => isOn(pathname, i.href));
  return (
    <div
      className={`inline-flex h-9 flex-wrap items-center gap-1 rounded-lg border px-2 ${
        active ? "border-white/35 bg-white/12" : "border-white/20 bg-white/8"
      }`}
    >
      <Link href={href} className="shrink-0 rounded-md px-1.5 text-sm font-bold text-white hover:bg-white/15">
        {label}
      </Link>
      <span className="mx-0.5 h-4 w-px bg-white/30" aria-hidden />
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </div>
  );
}

function SoloPill({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = isOn(pathname, item.href);
  return (
    <div className={`inline-flex h-9 items-center rounded-lg border px-1 ${on ? "border-white/35 bg-white/12" : "border-white/20 bg-white/8"}`}>
      <NavLink item={item} pathname={pathname} />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showUsage, setShowUsage] = useState(false);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("admin") === "1") {
        localStorage.setItem(USAGE_ADMIN_KEY, "1");
      }
      setShowUsage(localStorage.getItem(USAGE_ADMIN_KEY) === "1");
    } catch {
      setShowUsage(false);
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-header print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href="/" className="text-base font-semibold tracking-tight md:text-lg">
              시스템별 구축견적 산정 시스템
            </Link>
            <AttributionChip />
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <SoloPill item={HOME} pathname={pathname} />
            <NavGroup label="신규" href="/#new" items={NEW_BUILD} pathname={pathname} />
            <NavGroup label="추가개발" href="/#addon" items={ADDON} pathname={pathname} />
            {showUsage && <SoloPill item={{ href: "/usage", label: "사용량" }} pathname={pathname} />}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
