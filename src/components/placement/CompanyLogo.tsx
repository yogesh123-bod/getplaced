import { cn } from "@/lib/utils";

const PALETTE: Record<string, string> = {
  "Tata Consultancy Services": "oklch(0.35 0.14 264)",
  Infosys: "oklch(0.55 0.15 235)",
  Accenture: "oklch(0.5 0.25 300)",
  Wipro: "oklch(0.65 0.18 45)",
  Deloitte: "oklch(0.68 0.17 140)",
  Capgemini: "oklch(0.5 0.16 245)",
  Cognizant: "oklch(0.45 0.2 264)",
};

function short(name: string) {
  if (name.startsWith("Tata")) return "TCS";
  const words = name.split(" ").filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 3);
  return words
    .slice(0, 3)
    .map((w) => w[0]!)
    .join("");
}

export function CompanyLogo({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const color = PALETTE[name] ?? "oklch(0.4 0.13 264)";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-bold tracking-tight text-primary-foreground",
        size === "sm" && "size-9 text-[11px]",
        size === "md" && "size-11 text-xs",
        size === "lg" && "size-14 text-sm",
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {short(name).toUpperCase()}
    </div>
  );
}
