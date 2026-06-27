import { Globe } from "lucide-react";

export default function WebsiteIntelligencePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-inner">
          <Globe className="h-10 w-10 text-indigo-400" />
        </div>
        <div className="absolute inset-0 rounded-full ring-1 ring-indigo-200 ring-offset-2" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Website Intelligence</h1>
      <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">Coming Soon</p>
      <p className="mx-auto mt-4 max-w-sm text-sm text-slate-500">
        Bulk-scan websites for platform, CMS, page speed, SEO health, and
        redesign opportunity score — then filter and prioritise your outreach.
      </p>
    </div>
  );
}
