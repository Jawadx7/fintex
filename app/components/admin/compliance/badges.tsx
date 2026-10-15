import { Badge } from "@/app/components/ui/badge";
import type { AlertReviewStatus, AlertTier } from "@/lib/compliance/dto";
import { TYPOLOGIES, isTypologyTag } from "@/lib/compliance/typologies";
import { cn } from "@/lib/utils";

const TIER_CLASS: Record<AlertTier, string> = {
  LOW: "border-transparent bg-muted text-muted-foreground",
  MEDIUM:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
};

export function TierBadge({ tier }: { tier: AlertTier }) {
  return <Badge className={cn(TIER_CLASS[tier])}>{tier}</Badge>;
}

const STATUS_CLASS: Record<AlertReviewStatus, string> = {
  OPEN: "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400",
  ESCALATED:
    "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
  DISMISSED: "border-transparent bg-muted text-muted-foreground",
  CONFIRMED:
    "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function ReviewStatusBadge({
  status,
}: {
  status: AlertReviewStatus | null;
}) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Badge className={cn(STATUS_CLASS[status])}>{status}</Badge>;
}

export function TypologyTagBadge({ tag }: { tag: string }) {
  const typology = isTypologyTag(tag) ? TYPOLOGIES[tag] : null;
  return (
    <Badge variant="outline" title={typology?.description ?? tag}>
      {typology?.label ?? tag}
    </Badge>
  );
}
