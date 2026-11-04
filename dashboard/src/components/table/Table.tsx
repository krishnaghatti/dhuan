import { useMemo, useState } from "react";
import { HeaderCell } from "./HeaderCell";
import { Row } from "./Row";
import "./Table.scss";
import type { SortDirection, SortKey, TableRowData } from "./types";

interface TableProps {
  nameColumnLabel: string;
  rows: TableRowData[];
}

/** Sortable list of regions, colored via Level.ts. This is the accessible
 * primary view -- every AQI is shown as a number + category text, not color
 * alone (see the accessibility note in components/common/Level.ts). */
export function Table({ nameColumnLabel, rows }: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("aqi");
  const [direction, setDirection] = useState<SortDirection>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "aqi" ? "desc" : "asc");
    }
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        const aVal = a.aqi ?? -1;
        const bVal = b.aqi ?? -1;
        cmp = aVal - bVal;
      }
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, direction]);

  return (
    <table className="region-table">
      <thead>
        <tr>
          <HeaderCell label={nameColumnLabel} sortKey="name" activeSortKey={sortKey} direction={direction} onSort={handleSort} />
          <HeaderCell label="AQI" sortKey="aqi" activeSortKey={sortKey} direction={direction} onSort={handleSort} />
          <th>Dominant pollutant</th>
          <th>Recent trend</th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </tbody>
    </table>
  );
}
