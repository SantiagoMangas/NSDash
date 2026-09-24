"use client";

import { TeamsListPanel } from "@/components/teams/TeamsListPanel";
import { useToast } from "@/contexts/ToastContext";

export default function EquiposPage() {
  const { pushToast } = useToast();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <TeamsListPanel onToast={(type, message) => pushToast(type, message)} />
    </main>
  );
}
