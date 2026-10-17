"use client";

import { useEffect, useState } from "react";
import { getExchangeRate, updateExchangeRate, DEFAULT_EXCHANGE_RATE } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DollarSign, Coins, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRateUpdated?: (newRate: number) => void;
}

export function ExchangeRateConfigDialog({ open, onOpenChange, onRateUpdated }: Props) {
  const [currentRate, setCurrentRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [inputRate, setInputRate] = useState<string>("8.00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getExchangeRate().then((rate) => {
      setCurrentRate(rate);
      setInputRate(rate.toFixed(2));
    });
  }, [open]);

  async function handleSave() {
    const num = parseFloat(inputRate);
    if (isNaN(num) || num <= 0) {
      toast.error("Por favor ingresa un tipo de cambio válido mayor a 0");
      return;
    }

    setSaving(true);
    const res = await updateExchangeRate(num);
    setSaving(false);

    if (res.success) {
      toast.success(`✅ Tipo de cambio actualizado a ${num.toFixed(2)} Bs por 1 USD`);
      setCurrentRate(num);
      onRateUpdated?.(num);
      onOpenChange(false);
    } else {
      toast.error(res.message || "Error al actualizar tipo de cambio");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-1">
            <Coins className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
            Configurar Tipo de Cambio (USD / Bs)
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Ajusta el valor de conversión oficial del laboratorio. Todos los precios de catálogo en dólares ($ USD) se convertirán a Bolivianos (Bs) automáticamente según esta tasa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tasa actual activa:</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">
              1 USD = {currentRate.toFixed(2)} Bs
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Nuevo Tipo de Cambio (Bs por 1 USD)
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.05"
                min="1"
                value={inputRate}
                onChange={(e) => setInputRate(e.target.value)}
                placeholder="8.00"
                className="text-lg font-bold pl-12 h-12 rounded-xl"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Bs
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ejemplo: $50 USD equivaldrán a Bs {(parseFloat(inputRate || "0") * 50).toFixed(2)}.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              Este cambio afecta a las nuevas órdenes y cotizaciones. Las órdenes históricas ya facturadas conservan el monto registrado al momento de su aprobación.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-lg shadow-amber-600/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar Tasa Oficial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
