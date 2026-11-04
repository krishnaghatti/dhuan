import { Link } from "react-router-dom";
import { Cell } from "./Cell";
import { Minigraphs } from "./Minigraphs";
import type { TableRowData } from "./types";

export function Row({ row }: { row: TableRowData }) {
  return (
    <tr>
      <td>
        <Link to={row.path}>{row.name}</Link>
      </td>
      <td>
        <Cell aqi={row.aqi} level={row.level} />
      </td>
      <td className="table-row__dominant">{row.dominantPollutant ?? "—"}</td>
      <td>{row.sparkline && <Minigraphs values={row.sparkline} level={row.level} />}</td>
    </tr>
  );
}
