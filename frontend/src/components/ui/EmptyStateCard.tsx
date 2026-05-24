import type { ReactNode } from "react";

type EmptyStateCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export function EmptyStateCard({ icon, title, description }: EmptyStateCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 py-10 text-center shadow-sm transition-all duration-300">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{description}</p>
    </div>
  );
}
