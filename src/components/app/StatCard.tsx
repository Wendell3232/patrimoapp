import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  variation,
  hint,
  tone = "neutral",
  icon,
  accent,
}: {
  label: string;
  value: number;
  variation?: number | undefined;
  hint?: string | undefined;
  tone?: "neutral" | "positive" | "negative" | "primary" | undefined;
  icon?: ReactNode | undefined;
  accent?: "primary" | "positive" | "negative" | "warning" | undefined;
}) {
  const positiveVariation = variation != null && variation > 0.05;
  const negativeVariation = variation != null && variation < -0.05;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {icon && (
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground",
                accent === "primary" && "bg-primary/10 text-primary",
                accent === "positive" && "bg-positive/10 text-positive",
                accent === "negative" && "bg-destructive/10 text-destructive",
                accent === "warning" && "bg-warning/10 text-warning",
              )}
            >
              {icon}
            </span>
          )}
        </div>
        <p
          className={cn(
            "tabular text-[26px] font-semibold leading-tight text-foreground sm:text-[30px]",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-destructive",
            tone === "primary" && "text-primary",
          )}
        >
          {formatBRL(value)}
        </p>
        <div className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
          {variation != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                positiveVariation && "bg-positive/10 text-positive",
                negativeVariation && "bg-destructive/10 text-destructive",
                !positiveVariation && !negativeVariation && "bg-muted text-muted-foreground",
              )}
            >
              {positiveVariation ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : negativeVariation ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {formatPercent(variation)}
            </span>
          )}
          {hint && <span className="truncate">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
