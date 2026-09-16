import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/** Campo monetário em BRL. Aceita apenas dígitos e nunca produz valor negativo. */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, placeholder = "R$ 0,00", ...rest }, ref) => {
    const display = value == null || !Number.isFinite(value) ? "" : formatter.format(value);

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        value={display}
        placeholder={placeholder}
        className={cn("tabular text-right text-base", className)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (digits === "") {
            onValueChange(null);
            return;
          }
          const parsed = Number(digits) / 100;
          onValueChange(Number.isFinite(parsed) ? parsed : null);
        }}
        {...rest}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
