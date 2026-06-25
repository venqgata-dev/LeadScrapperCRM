import { Badge } from "./Badge";
import { WEBSITE_STATUS_COLORS, WEBSITE_STATUS_LABELS } from "@/lib/utils";
import type { WebsiteStatus } from "@/lib/api";

export function WebsiteStatusBadge({ status }: { status: WebsiteStatus }) {
  return (
    <Badge className={WEBSITE_STATUS_COLORS[status]}>
      {WEBSITE_STATUS_LABELS[status]}
    </Badge>
  );
}
