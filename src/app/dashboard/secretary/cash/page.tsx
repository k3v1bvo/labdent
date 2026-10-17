"use client";

import SecretaryLayout from "@/components/layouts/SecretaryLayout";
import { CashRegisterView } from "@/components/cash/CashRegisterView";

export default function SecretaryCashPage() {
  return (
    <SecretaryLayout>
      <CashRegisterView role="secretaria" />
    </SecretaryLayout>
  );
}
