import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ContactStatus, WebsiteStatus } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  NO_WEBSITE: "No Website",
  FACEBOOK_ONLY: "Facebook Only",
  FREE_BUILDER: "Free Builder",
  BROKEN_WEBSITE: "Broken Website",
  HAS_WEBSITE: "Has Website",
};

export const WEBSITE_STATUS_COLORS: Record<WebsiteStatus, string> = {
  NO_WEBSITE: "bg-red-100 text-red-800",
  FACEBOOK_ONLY: "bg-orange-100 text-orange-800",
  FREE_BUILDER: "bg-yellow-100 text-yellow-800",
  BROKEN_WEBSITE: "bg-gray-100 text-gray-700",
  HAS_WEBSITE: "bg-green-100 text-green-800",
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  NEW: "New",
  CALLED: "Called",
  NO_ANSWER: "No Answer",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  PROPOSAL_SENT: "Proposal Sent",
  WON: "Won",
  LOST: "Lost",
  CONTACTED: "Contacted", // legacy
};

export const CONTACT_STATUS_COLORS: Record<ContactStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CALLED: "bg-blue-100 text-blue-800",
  NO_ANSWER: "bg-orange-100 text-orange-700",
  INTERESTED: "bg-purple-100 text-purple-800",
  FOLLOW_UP: "bg-sky-100 text-sky-800",
  PROPOSAL_SENT: "bg-indigo-100 text-indigo-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-700",
  CONTACTED: "bg-blue-100 text-blue-700", // legacy
};

// Pipeline order for the Kanban board
export const PIPELINE_STAGES: ContactStatus[] = [
  "NEW", "CALLED", "NO_ANSWER", "INTERESTED", "FOLLOW_UP", "PROPOSAL_SENT", "WON", "LOST",
];

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
