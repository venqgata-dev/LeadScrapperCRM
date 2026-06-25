"use client";

import { useState, useRef } from "react";
import { importCsv, type ImportResult } from "@/lib/api";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";

const EXAMPLE_CSV = `name,phone,website,city,country,category
ABC Roofing,07123456789,,London,United Kingdom,Roofing
XYZ Plumbing,0899999999,facebook.com/xyz,Varna,Bulgaria,Plumbing
Best Builders Ltd,07700900123,https://bestbuilders.wix.com,Manchester,United Kingdom,Construction
Sofia Bakery,,https://sofiabakery.com,Sofia,Bulgaria,Food & Drink`;

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const r = await importCsv(file);
      setResult(r);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function downloadExample() {
    const blob = new Blob([EXAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "example_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Import Leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a CSV file to import businesses. Duplicates are automatically merged.
        </p>
      </div>

      {/* Example */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">CSV Format</h2>
          <button
            onClick={downloadExample}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Download Example
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-500">Required column: <code className="rounded bg-slate-100 px-1 py-0.5">name</code>. All others are optional.</p>
        <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed">
          {EXAMPLE_CSV}
        </pre>
        <p className="mt-2 text-xs text-slate-400">
          Website classification is automatic — leave blank for no website, use facebook.com/... for Facebook, wix.com/... for free builders.
        </p>
      </div>

      {/* Upload form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 transition-colors hover:border-slate-400 hover:bg-slate-50"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            {file ? (
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">Click to select a CSV file</p>
                <p className="text-xs text-slate-400">or drag and drop</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "Importing…" : "Import CSV"}
          </button>
        </form>

        {result && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-800">Import complete</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-green-600">Imported</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-600">{result.skipped}</p>
                <p className="text-xs text-slate-500">Skipped</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a href="/leads" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                View Leads
              </a>
              <a href="/opportunities" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                View Opportunities
              </a>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
