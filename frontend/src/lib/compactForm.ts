/** Clases compartidas para formularios compactos (Resistencia / Velocidad). */

export function compactInputClassName(disabled = false): string {
  return `w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
    disabled ? "cursor-not-allowed opacity-60" : ""
  }`;
}

/** Fila responsive: columna en móvil, campos en línea en pantalla ancha. */
export function compactFieldsRowClassName(): string {
  return "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end";
}

/** Ancho flexible por campo en fila compacta. */
export function compactFieldWrapClassName(width: "date" | "numeric" | "wide" = "numeric"): string {
  switch (width) {
    case "date":
      return "min-w-0 w-full sm:w-auto sm:flex-none sm:min-w-[10.5rem]";
    case "wide":
      return "min-w-0 w-full sm:flex-1 sm:min-w-[8rem] sm:max-w-[14rem]";
    default:
      return "min-w-0 w-full sm:flex-1 sm:min-w-[6.5rem] sm:max-w-[11rem]";
  }
}

export function compactFieldLabelClassName(): string {
  return "block text-xs text-slate-500 mb-1";
}
