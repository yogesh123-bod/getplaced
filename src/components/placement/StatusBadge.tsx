import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  Applied: "bg-info/12 text-info",
  "Under Review": "bg-warning/18 text-warning-foreground",
  Shortlisted: "bg-success/15 text-success",
  Selected: "bg-primary/12 text-primary",
  Rejected: "bg-destructive/12 text-destructive",
  open: "bg-success/15 text-success",
  closed: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {status === "open" ? "Open" : status === "closed" ? "Closed" : status}
    </span>
  );
}

export function EligibilityBadge({
  eligible,
  applied,
  className,
}: {
  eligible: boolean;
  applied?: boolean;
  className?: string;
}) {
  if (applied)
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success",
          className,
        )}
      >
        <Check className="size-3" /> Applied
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        eligible ? "bg-success/15 text-success" : "bg-destructive/12 text-destructive",
        className,
      )}
    >
      {eligible ? <Check className="size-3" /> : <X className="size-3" />}
      {eligible ? "Eligible" : "Not Eligible"}
    </span>
  );
}
