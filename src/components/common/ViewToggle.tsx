"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, Table2 } from "lucide-react";

export type ViewMode = "cards" | "table";

export default function ViewToggle({
  value,
  onChange,
  labels,
  className = "",
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  labels?: { cards?: string; table?: string };
  className?: string;
}) {
  const cardsLabel = labels?.cards ?? "Tarjetas";
  const tableLabel = labels?.table ?? "Tabla";

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border bg-white p-1 shadow-sm ${className}`}
    >
      <Button
        type="button"
        variant={value === "cards" ? "default" : "ghost"}
        className={`h-9 px-3 rounded-lg ${
          value === "cards" ? "" : "text-gray-600 hover:bg-gray-100"
        }`}
        onClick={() => onChange("cards")}
        title="Ver en tarjetas"
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        {cardsLabel}
      </Button>

      <Button
        type="button"
        variant={value === "table" ? "default" : "ghost"}
        className={`h-9 px-3 rounded-lg ${
          value === "table" ? "" : "text-gray-600 hover:bg-gray-100"
        }`}
        onClick={() => onChange("table")}
        title="Ver en tabla"
      >
        <Table2 className="w-4 h-4 mr-2" />
        {tableLabel}
      </Button>
    </div>
  );
}
