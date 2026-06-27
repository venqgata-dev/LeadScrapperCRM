import { BrainCircuit } from "lucide-react";

export default function ContactIntelligencePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-50 to-cyan-100 shadow-inner">
          <BrainCircuit className="h-10 w-10 text-cyan-400" />
        </div>
        <div className="absolute inset-0 rounded-full ring-1 ring-cyan-200 ring-offset-2" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Contact Intelligence</h1>
      <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-cyan-500">Coming Soon</p>
      <p className="mx-auto mt-4 max-w-sm text-sm text-slate-500">
        Auto-discover decision-maker names, direct emails, LinkedIn profiles, and
        social follower counts for every lead in your database.
      </p>
    </div>
  );
}
