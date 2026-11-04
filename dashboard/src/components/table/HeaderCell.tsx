import type { SortDirection, SortKey } from "./types";

interface HeaderCellProps {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}

export function HeaderCell({ label, sortKey, activeSortKey, direction, onSort }: HeaderCellProps) {
  const active = sortKey === activeSortKey;
  return (
    <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="header-cell" onClick={() => onSort(sortKey)}>
        {label}
        {active && <span className="header-cell__arrow">{direction === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
