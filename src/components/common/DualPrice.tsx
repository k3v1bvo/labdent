"use client";

import { useEffect, useState } from "react";
import { formatDualCurrency, getCachedExchangeRate, getExchangeRate } from "@/lib/currency";

interface DualPriceProps {
  amountBs: number | null | undefined;
  rate?: number;
  isDebt?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  bsClassName?: string;
  showBreakdown?: boolean;
}

export function DualPrice({
  amountBs,
  rate,
  isDebt = false,
  size = "md",
  className = "",
  bsClassName = "",
  showBreakdown = true,
}: DualPriceProps) {
  const [exchangeRate, setExchangeRate] = useState<number>(rate || getCachedExchangeRate());

  useEffect(() => {
    if (rate) {
      setExchangeRate(rate);
      return;
    }
    getExchangeRate().then((r) => setExchangeRate(r));

    const handleRateChange = (e: any) => {
      if (e.detail && typeof e.detail === "number") {
        setExchangeRate(e.detail);
      }
    };

    window.addEventListener("guisela_exchange_rate_changed", handleRateChange);
    return () => window.removeEventListener("guisela_exchange_rate_changed", handleRateChange);
  }, [rate]);

  const { bsFormatted, usdFormatted, rawBs } = formatDualCurrency(amountBs, exchangeRate);

  // Regla de negocio: Saldos pendientes / deudas deben resaltarse en rojo vivo
  const isActualDebt = isDebt || (isDebt !== false && rawBs > 0);

  const sizeClasses = {
    sm: {
      container: "text-xs",
      bs: "text-xs font-bold",
      usd: "text-[10px]",
    },
    md: {
      container: "text-sm",
      bs: "text-sm font-extrabold tracking-tight",
      usd: "text-xs font-medium",
    },
    lg: {
      container: "text-base",
      bs: "text-lg font-black tracking-tight",
      usd: "text-xs font-semibold",
    },
    xl: {
      container: "text-lg",
      bs: "text-2xl font-black tracking-tight",
      usd: "text-sm font-semibold",
    },
  }[size];

  return (
    <div
      className={`inline-flex items-baseline gap-1.5 flex-wrap ${
        isActualDebt
          ? "text-rose-600 dark:text-rose-400 font-semibold"
          : "text-slate-900 dark:text-white"
      } ${className}`}
    >
      <span className={sizeClasses.bs}>{bsFormatted}</span>
      {showBreakdown && (
        <span
          className={`${sizeClasses.usd} ${
            isActualDebt
              ? "text-rose-500/90 dark:text-rose-300/80"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {usdFormatted}
        </span>
      )}
    </div>
  );
}
