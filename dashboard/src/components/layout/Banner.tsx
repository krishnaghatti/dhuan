import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "../../api/dataClient";
import type { LatestCity, LatestData } from "../../api/types";
import { StatCard } from "../common/StatCard";
import "./Banner.scss";

function worstCity(latest: LatestData): (LatestCity & { state_id: string }) | null {
  let worst: (LatestCity & { state_id: string }) | null = null;
  for (const state of latest.states) {
    for (const city of state.cities) {
      if (city.aqi === null) continue;
      if (!worst || city.aqi > (worst.aqi ?? -Infinity)) {
        worst = { ...city, state_id: state.state_id };
      }
    }
  }
  return worst;
}

export function Banner() {
  const [latest, setLatest] = useState<LatestData | null>(null);

  useEffect(() => {
    dataClient.latest().then(setLatest);
  }, []);

  if (!latest) return null;
  const worst = worstCity(latest);
  if (!worst) return null;

  return (
    <div className="banner">
      <Link to={`/state/${worst.state_id}/${worst.city_id}`} className="banner__link">
        <StatCard label="Worst city today" aqi={worst.aqi} level={worst.level} sublabel={worst.city} />
      </Link>
    </div>
  );
}
