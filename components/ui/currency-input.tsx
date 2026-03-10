"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface CurrencyInputProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function toDisplay(raw: string): string {
  if (!raw) return "";
  const [intStr, decStr] = raw.split(".");
  const intNum = parseInt(intStr || "0", 10);
  if (isNaN(intNum)) return "";
  const formattedInt = intNum.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
  // Only show decimal part if it has non-zero digits
  if (decStr !== undefined && parseInt(decStr, 10) !== 0) {
    return `${formattedInt},${decStr}`;
  }
  return formattedInt;
}

function toRaw(display: string): string {
  return display.replace(/\./g, "").replace(",", ".");
}

function dotCount(str: string): number {
  return (str.match(/\./g) || []).length;
}

export function CurrencyInput({
  value,
  onChange,
  className,
  onBlur,
  onFocus,
  ...props
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  const [displayValue, setDisplayValue] = useState(() => toDisplay(value));

  // Sync display when external value changes (e.g., hook auto-updates last line)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplayValue(toDisplay(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cursor = e.target.selectionStart ?? input.length;

    // Count dots in old integer part to compute cursor adjustment
    const oldIntDots = dotCount(displayValue.split(",")[0] || displayValue);

    // Strip formatting dots, keep only digits and comma
    const cleaned = input.replace(/\./g, "").replace(/[^0-9,]/g, "");

    // Split on first comma (decimal separator)
    const commaIdx = cleaned.indexOf(",");
    const hasComma = commaIdx !== -1;
    const intStr = hasComma ? cleaned.slice(0, commaIdx) : cleaned;
    const decStr = hasComma ? cleaned.slice(commaIdx + 1) : "";

    // Clamp decimal to 2 digits
    const clampedDec = decStr.slice(0, 2);

    // Format integer part
    const intNum = parseInt(intStr || "0", 10);
    const formattedInt =
      intStr === ""
        ? ""
        : isNaN(intNum)
          ? "0"
          : intNum.toLocaleString("es-AR", { maximumFractionDigits: 0 });

    // Build new display value
    const newDisplay = hasComma
      ? `${formattedInt},${clampedDec}`
      : formattedInt;

    // Build raw value (dot decimal, no thousands)
    const rawValue = hasComma ? `${intStr || "0"}.${clampedDec}` : intStr || "";

    setDisplayValue(newDisplay);

    // Fire onChange with raw value as e.target.value
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: rawValue },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);

    // Restore cursor adjusted for dots added/removed in the integer part
    const newIntDots = dotCount(formattedInt);
    const adjustedCursor = Math.max(0, cursor + (newIntDots - oldIntDots));
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(adjustedCursor, adjustedCursor);
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    const num = parseFloat(toRaw(displayValue));
    if (!isNaN(num) && num >= 0) {
      setDisplayValue(
        num.toLocaleString("es-AR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }),
      );
    } else if (!displayValue) {
      setDisplayValue("");
    }
    onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    onFocus?.(e);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      data-slot="input"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
