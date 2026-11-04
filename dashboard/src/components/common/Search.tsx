import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataClient } from "../../api/dataClient";
import type { MetaCity, MetaState, MetaStation } from "../../api/types";
import "./Search.scss";

interface SearchResult {
  kind: "state" | "city" | "station";
  label: string;
  sublabel: string;
  path: string;
}

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<MetaState[]>([]);
  const [cities, setCities] = useState<MetaCity[]>([]);
  const [stations, setStations] = useState<MetaStation[]>([]);
  const [loaded, setLoaded] = useState(false);

  function ensureLoaded() {
    if (loaded) return;
    setLoaded(true);
    Promise.all([dataClient.metaStates(), dataClient.metaCities(), dataClient.metaStations()]).then(
      ([s, c, st]) => {
        setStates(s);
        setCities(c);
        setStations(st);
      },
    );
  }

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const stateResults: SearchResult[] = states
      .filter((s) => s.name.toLowerCase().includes(q))
      .map((s) => ({ kind: "state", label: s.name, sublabel: "State", path: `/state/${s.id}` }));

    const cityResults: SearchResult[] = cities
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({ kind: "city", label: c.name, sublabel: "City", path: `/state/${c.state_id}/${c.id}` }));

    const stationResults: SearchResult[] = stations
      .filter((s) => s.name.toLowerCase().includes(q))
      .map((s) => ({
        kind: "station",
        label: s.name,
        sublabel: "Station",
        path: `/state/${s.state_id}/${s.city_id}/${s.id}`,
      }));

    return [...stateResults, ...cityResults, ...stationResults].slice(0, 20);
  }, [query, states, cities, stations]);

  return (
    <div className="search">
      <input
        type="search"
        className="search__input"
        placeholder="Search state, city, or station..."
        value={query}
        onFocus={ensureLoaded}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="search__results">
          {results.map((r) => (
            <li key={`${r.kind}-${r.path}`}>
              <button
                type="button"
                className="search__result"
                onClick={() => {
                  navigate(r.path);
                  setQuery("");
                }}
              >
                <span className="search__result-label">{r.label}</span>
                <span className="search__result-sublabel">{r.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
