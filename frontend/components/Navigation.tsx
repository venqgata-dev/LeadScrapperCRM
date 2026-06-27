"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "lead-gen",
    label: "Lead Generation",
    items: [
      { label: "Lead Finder", href: "/" },
      { label: "Campaigns", href: "/campaigns" },
      { label: "Import", href: "/import" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    items: [
      { label: "Dashboard", href: "/crm" },
      { label: "Leads", href: "/leads" },
      { label: "Opportunities", href: "/opportunities" },
      { label: "Pipeline", href: "/pipeline" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { label: "Workspace", href: "/workspace" },
      { label: "Call Queue", href: "/call-list" },
      { label: "Playbooks", href: "/playbooks" },
    ],
  },
];

const SETTINGS: NavItem = { label: "Settings", href: "/settings" };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function groupIsActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isActive(pathname, item.href));
}

export default function Navigation() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  function toggleGroup(id: string) {
    setOpenGroup((prev) => (prev === id ? null : id));
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm" ref={navRef}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Brand */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-bold text-slate-900 text-lg"
          >
            <span className="rounded-lg bg-blue-600 px-2 py-0.5 text-sm font-bold text-white tracking-tight">
              LS
            </span>
            <span className="hidden sm:inline">LeadScrapper</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_GROUPS.map((group) => {
              const active = groupIsActive(pathname, group);
              const open = openGroup === group.id;

              return (
                <div key={group.id} className="relative">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {group.label}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {open && (
                    <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {group.items.map((item) => {
                        const itemActive = isActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center px-3 py-2 text-sm transition-colors ${
                              itemActive
                                ? "bg-blue-50 font-semibold text-blue-700"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            {itemActive && (
                              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                            )}
                            {!itemActive && <span className="mr-2 h-1.5 w-1.5 shrink-0" />}
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex-1" />

            {/* Settings — standalone */}
            <Link
              href={SETTINGS.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive(pathname, SETTINGS.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {SETTINGS.label}
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-3 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const itemActive = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          itemActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="border-t border-slate-100 pt-3">
              <Link
                href={SETTINGS.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(pathname, SETTINGS.href)
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {SETTINGS.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
