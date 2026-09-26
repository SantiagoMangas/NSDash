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
