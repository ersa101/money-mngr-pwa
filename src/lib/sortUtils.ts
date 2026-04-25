// V2.7.4 D046 — locale-aware, numeric, case-insensitive sort by name
// Used in dropdowns of accounts / categories / subcategories.
// Excluded by spec: search suggestions and notes (time-sorted, latest-first).

export function sortByName<T extends { name: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}
