import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { statusStage } from "@/lib/eligibility";

export function StatusTimeline({ status }: { status: string }) {
  const rejected = status === "Rejected";
  const steps = rejected
    ? ["Applied", "Under Review", "Rejected"]
    : ["Applied", "Under Review", "Shortlisted", "Selected"];
  const current = rejected ? 2 : statusStage(status);

  return (
    <div className="flex items-start">
      {steps.map((step, i) => {
        const done = i <= current;
        const isFail = rejected && i === 2;
        return (
          <div key={step} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div className={cn("h-1 flex-1 rounded-full", i === 0 ? "bg-transparent" : done ? "bg-primary/60" : "bg-border")} />
              <div
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  isFail
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card",
                )}
              >
                {done ? isFail ? <X className="size-3" /> : <Check className="size-3" /> : null}
              </div>
              <div
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i === steps.length - 1 ? "bg-transparent" : i < current ? "bg-primary/60" : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 text-center text-[10px] leading-tight",
                done ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
