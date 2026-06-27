"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart2,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Download,
  Globe,
  Kanban,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  Phone,
  RefreshCw,
  Search,
  Settings,
  SquareCheckBig,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavLeaf = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  children: NavLeaf[];
};

type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const NAV: NavItem[] = [
  { label: "Lead Finder", href: "/", icon: Search },
  {
    label: "CRM",
    icon: LayoutDashboard,
    children: [
      { label: "Dashboard",     href: "/crm",            icon: LayoutDashboard },
      { label: "Leads",         href: "/leads",          icon: Users },
      { label: "Opportunities", href: "/opportunities",  icon: Target },
      { label: "Pipeline",      href: "/pipeline",       icon: Kanban },
      { label: "Campaigns",     href: "/campaigns",      icon: Megaphone },
    ],
  },
  {
    label: "Sales",
    icon: Phone,
    children: [
      { label: "Call Queue", href: "/call-list",          icon: Phone },
      { label: "Tasks",      href: "/tasks",              icon: SquareCheckBig },
      { label: "Outreach",   href: "/outreach",           icon: Mail },
      { label: "Sales AI",   href: "/sales-intelligence", icon: Zap },
    ],
  },
  {
    label: "Automation",
    icon: RefreshCw,
    children: [
      { label: "Enrichment",             href: "/enrichment",            icon: RefreshCw },
      { label: "Contact Intelligence",   href: "/contact-intelligence",  icon: BrainCircuit },
      { label: "Website Intelligence",   href: "/website-intelligence",  icon: Globe },
    ],
  },
  {
    label: "Reports",
    icon: BarChart2,
    children: [
      { label: "Analytics",    href: "/analytics",    icon: BarChart2 },
      { label: "Export Center",href: "/export",       icon: Download },
      { label: "API Usage",    href: "/api-usage",    icon: BookOpen },
      { label: "Performance",  href: "/performance",  icon: TrendingUp },
    ],
  },
  { label: "Settings", href: "/settings", icon: Settings },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function groupIsActive(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => isActive(pathname, c.href));
}

// ─── Desktop dropdown ─────────────────────────────────────────────────────────

function DesktopDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = groupIsActive(pathname, group);

  // close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`
          flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
          ${active
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
        `}
      >
        {group.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg ring-1 ring-black/5">
          {group.children.map((child) => {
            const childActive = isActive(pathname, child.href);
            const Icon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors
                  ${childActive
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <Icon
                  className={`h-3.5 w-3.5 flex-shrink-0 ${childActive ? "text-blue-600" : "text-slate-400"}`}
                />
                {child.label}
                {child.badge && (
                  <span className="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    {child.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mobile sidebar ───────────────────────────────────────────────────────────

function MobileSidebar({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  // close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  // lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform overflow-y-auto bg-white shadow-2xl transition-transform duration-200 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <span className="flex items-center gap-2 font-bold text-slate-900">
            <span className="rounded-lg bg-blue-600 px-2 py-0.5 text-sm font-bold text-white tracking-tight">
              LS
            </span>
            LeadScrapper
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Links */}
        <nav className="p-3 space-y-0.5">
          {NAV.map((item) => {
            if (isGroup(item)) {
              const Icon = item.icon;
              const active = groupIsActive(pathname, item);
              return (
                <div key={item.label}>
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                      active ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                  <div className="ml-2 space-y-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                            childActive
                              ? "bg-blue-50 font-semibold text-blue-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <ChildIcon
                            className={`h-4 w-4 flex-shrink-0 ${
                              childActive ? "text-blue-600" : "text-slate-400"
                            }`}
                          />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const Icon = item.icon;
            const leafActive = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  leafActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

// ─── Main NavBar ──────────────────────────────────────────────────────────────

export default function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-4">

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Brand */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-bold text-slate-900 text-[15px]"
            >
              <span className="rounded-lg bg-blue-600 px-2 py-0.5 text-sm font-bold text-white tracking-tight">
                LS
              </span>
              <span className="hidden sm:inline">LeadScrapper</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-2">
              {NAV.map((item) => {
                if (isGroup(item)) {
                  return (
                    <DesktopDropdown
                      key={item.label}
                      group={item}
                      pathname={pathname}
                    />
                  );
                }

                const Icon = item.icon;
                const leafActive = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                      ${item.href === "/"
                        ? leafActive
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                        : leafActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
                    `}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
      />
    </>
  );
}
