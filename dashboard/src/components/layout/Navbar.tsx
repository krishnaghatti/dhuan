import { Link } from "react-router-dom";
import { Search } from "../common/Search";
import "./Navbar.scss";

export function Navbar() {
  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        India AQI Tracker
      </Link>
      <Search />
    </header>
  );
}
