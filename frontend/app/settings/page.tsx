"use client";

import { useEffect, useState } from "react";
import {
  fetchCloudTalkStatus,
  testCloudTalkConnection,
  type CloudTalkStatus,
} from "@/lib/api";
import { CheckCircle2, XCircle, Phone, RefreshCw, Settings } from "lucide-react";

export default function SettingsPage() {
  const [status, setStatus] = useState<CloudTalkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchCloudTalkStatus();
      setStatus(s);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    try {
      const s = await testCloudTalkConnection();
      setStatus(s);
    } catch (e) {
      setError(String(e));
    } finally {
      setTesting(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Integrations section */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Integrations
        </h2>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">CloudTalk</h3>
              <p className="text-xs text-slate-500">
                Click-to-call, call history, and webhook sync
              </p>
            </div>
            {status && (
              <StatusChip configured={status.configured} connected={status.connected} />
            )}
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* API key hint */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p className="font-medium text-slate-800">Configuration (.env)</p>
              <div className="space-y-1.5 text-xs">
                <p>
                  <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono">CLOUDTALK_API_KEY</code>
                  {" "}— format: <code className="font-mono">api_key_id:api_key_secret</code>
                </p>
                <p className="text-slate-500">
                  Copy from CloudTalk Dashboard → Settings → API Keys → Key ID + Key Secret.
                </p>
                <p className="mt-1">
                  <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono">CLOUDTALK_AGENT_ID</code>
                  {" "}— integer agent ID, required for click-to-call
                </p>
                <p className="text-slate-500">
                  Copy from CloudTalk Dashboard → Agents → click an agent → the numeric ID in the URL.
                </p>
              </div>
            </div>

            {/* Status display */}
            {loading ? (
              <p className="text-sm text-slate-400 animate-pulse">Checking connection…</p>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : status ? (
              <StatusDetails status={status} />
            ) : null}

            {/* Test button */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleTest}
                disabled={testing || loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} />
                {testing ? "Testing…" : "Test Connection"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Webhook info */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Webhooks
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 text-sm">
          <p className="text-slate-700">
            Configure this URL in CloudTalk Dashboard → Settings → Webhooks to receive
            real-time call events:
          </p>
          <code className="block rounded-lg bg-slate-900 px-4 py-3 text-xs font-mono text-green-400 break-all">
            {typeof window !== "undefined"
              ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/cloudtalk/webhook`
              : "/cloudtalk/webhook"}
          </code>
          <p className="text-xs text-slate-500">
            Supported events:{" "}
            <span className="font-mono text-slate-700">
              call.started · call.answered · call.finished · recording.ready
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

function StatusChip({ configured, connected }: { configured: boolean; connected: boolean }) {
  if (!configured) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        Not configured
      </span>
    );
  }
  if (connected) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Connected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Not connected
    </span>
  );
}

function StatusDetails({ status }: { status: CloudTalkStatus }) {
  if (!status.configured) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <XCircle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">API key not configured</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Add <code className="font-mono">CLOUDTALK_API_KEY</code> to your .env and restart the backend.
          </p>
        </div>
      </div>
    );
  }

  if (status.connected) {
    const info = status.account_info;
    const agentCount =
      typeof info === "object" && info !== null
        ? (info as Record<string, unknown>)?.responseData
          ? Object.keys((info as Record<string, unknown>).responseData as object).length
          : undefined
        : undefined;

    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">Connected successfully</p>
          {agentCount !== undefined && (
            <p className="text-xs text-green-700 mt-0.5">Agents visible: {agentCount}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-red-800">Connection failed</p>
        {status.error && (
          <p className="text-xs text-red-700 mt-0.5 font-mono break-all">{status.error}</p>
        )}
      </div>
    </div>
  );
}
