import "./Footer.scss";

export function Footer() {
  return (
    <footer className="footer">
      <p>
        Data source: <a href="https://data.gov.in" target="_blank" rel="noreferrer">data.gov.in</a> real-time
        national AQI feed (CPCB). AQI computed from CPCB's National AQI sub-index methodology; see the
        methodology note for approximations made for 2-hourly source data.
      </p>
    </footer>
  );
}
