export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function exerciseMatchesSearch(name: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(name).includes(q);
}

export function filterExercisesByName<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  return items.filter((item) => exerciseMatchesSearch(item.name, query));
}

/** Ejercicios creados por pruebas E2E o tests de catálogo — no mostrar en el panel. */
export function isTestCatalogExercise(name: string): boolean {
  const n = normalizeForSearch(name);
  if (n.startsWith("prueba catalogo e2e")) return true;
  if (n === "test brzycki catalog") return true;
  if (n === "test epley catalog ui") return true;
  return false;
}

export function filterExercisesForPanel<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  return filterExercisesByName(
    items.filter((item) => !isTestCatalogExercise(item.name)),
    query,
  );
}
