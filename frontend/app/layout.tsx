import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadScrapper",
  description: "Website Sales CRM — find businesses that need a website",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center gap-6">

              {/* Brand */}
              <a href="/" className="flex shrink-0 items-center gap-2 font-bold text-slate-900 text-lg">
                <span className="rounded-lg bg-blue-600 px-2 py-0.5 text-sm font-bold text-white tracking-tight">
                  LS
                </span>
                LeadScrapper
              </a>

              {/* Nav */}
              <nav className="flex items-center gap-1 overflow-x-auto">
                <a
                  href="/"
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Lead Finder
                </a>

                <span className="mx-2 text-slate-200">|</span>

                <span className="mr-1 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">CRM</span>
                <a
                  href="/crm"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  Dashboard
                </a>
                <a
                  href="/pipeline"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  Pipeline
                </a>
                <a
                  href="/leads"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  Leads
                </a>
                <a
                  href="/call-list"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  Call List
                </a>
              </nav>

            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
