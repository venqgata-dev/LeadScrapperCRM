import { Badge } from "./Badge";
import { CONTACT_STATUS_COLORS, CONTACT_STATUS_LABELS } from "@/lib/utils";
import type { ContactStatus } from "@/lib/api";

export function ContactStatusBadge({ status }: { status: ContactStatus | string }) {
  const key = status as ContactStatus;
  const label = CONTACT_STATUS_LABELS[key] ?? status;
  const color = CONTACT_STATUS_COLORS[key] ?? "bg-slate-100 text-slate-700";
  return <Badge className={color}>{label}</Badge>;
}
