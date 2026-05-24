type LoadingCardProps = {
  message?: string;
};

export function LoadingCard({ message = "Cargando..." }: LoadingCardProps) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        <p className="text-sm text-slate-500 animate-pulse">{message}</p>
      </div>
    </section>
  );
}
