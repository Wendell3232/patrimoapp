import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMonthLabel } from "@/lib/format";
import type { PeriodKind } from "@/lib/finance";
import { cn } from "@/lib/utils";

const OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "ano", label: "Ano" },
  { value: "custom", label: "Personalizado" },
];

export function PeriodSelector({
  kind,
  anchor,
  custom,
  onKindChange,
  onAnchorChange,
  onCustomChange,
}: {
  kind: PeriodKind;
  anchor: Date;
  custom: { start: string; end: string };
  onKindChange: (kind: PeriodKind) => void;
  onAnchorChange: (date: Date) => void;
  onCustomChange: (range: { start: string; end: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-muted p-1">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onKindChange(option.value)}
            className={cn(
              "h-8 shrink-0 rounded-sm px-3 text-xs",
              kind === option.value
                ? "bg-card text-foreground shadow-xs hover:bg-card hover:text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {kind === "custom" ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Definir datas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="periodo-inicio">Início</Label>
              <Input
                id="periodo-inicio"
                type="date"
                value={custom.start}
                onChange={(e) => onCustomChange({ ...custom, start: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodo-fim">Fim</Label>
              <Input
                id="periodo-fim"
                type="date"
                value={custom.end}
                onChange={(e) => onCustomChange({ ...custom, end: e.target.value })}
              />
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex items-center gap-1 rounded-md border border-border bg-card px-1 py-1 shadow-xs">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Período anterior"
            onClick={() =>
              onAnchorChange(
                kind === "ano"
                  ? new Date(anchor.getFullYear() - 1, anchor.getMonth(), 1)
                  : new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-28 text-center text-xs font-medium">
            {kind === "ano" ? anchor.getFullYear() : formatMonthLabel(anchor)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Próximo período"
            onClick={() =>
              onAnchorChange(
                kind === "ano"
                  ? new Date(anchor.getFullYear() + 1, anchor.getMonth(), 1)
                  : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
