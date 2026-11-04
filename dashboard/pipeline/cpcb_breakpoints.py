"""CPCB National AQI breakpoint tables and sub-index calculation.

Concentrations are in ug/m3 for all pollutants except CO, which is in mg/m3
(normalize.py converts raw CO readings from ug/m3 to mg/m3 before lookup here).

Each breakpoint tuple is (C_LO, C_HI, I_LO, I_HI) for one AQI category band.
The last band (Severe, I_LO=401) is open-ended on concentration; see SEVERE_CAP
in config.py for how out-of-table-range values above it are handled.
"""

from config import SEVERE_CAP

# category bands: Good, Satisfactory, Moderate, Poor, Very Poor, Severe
BREAKPOINTS = {
    "PM2.5": [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, float("inf"), 401, 500),
    ],
    "PM10": [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, float("inf"), 401, 500),
    ],
    "NO2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, float("inf"), 401, 500),
    ],
    "SO2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 380, 101, 200),
        (381, 800, 201, 300),
        (801, 1600, 301, 400),
        (1601, float("inf"), 401, 500),
    ],
    "NH3": [
        (0, 200, 0, 50),
        (201, 400, 51, 100),
        (401, 800, 101, 200),
        (801, 1200, 201, 300),
        (1201, 1800, 301, 400),
        (1801, float("inf"), 401, 500),
    ],
    # mg/m3
    "CO": [
        (0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10, 101, 200),
        (10.1, 17, 201, 300),
        (17.1, 34, 301, 400),
        (34.1, float("inf"), 401, 500),
    ],
    "OZONE": [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 168, 101, 200),
        (169, 208, 201, 300),
        (209, 748, 301, 400),
        (749, float("inf"), 401, 500),
    ],
}


def sub_index(pollutant: str, concentration: float) -> float:
    """Linear-interpolate a pollutant concentration to its CPCB sub-index.

    CPCB's published tables have integer-boundary gaps between bands (e.g.
    PM2.5: 0-30, then 31-60) because they assume whole-number readings.
    Real station averages are fractional (derived from min/max/avg over
    multiple readings), so a value like 30.5 would fall in that gap. To stay
    continuous, band *membership* is decided by the first band whose C_HI is
    >= the concentration (bands sorted ascending); the *interpolation* still
    uses that band's official C_LO/C_HI from the published table.
    """
    if concentration < 0:
        raise ValueError(f"negative concentration for {pollutant}: {concentration}")

    bands = BREAKPOINTS[pollutant]
    for c_lo, c_hi, i_lo, i_hi in bands:
        if concentration <= c_hi:
            if c_hi == float("inf"):
                return float(SEVERE_CAP)
            index = ((i_hi - i_lo) / (c_hi - c_lo)) * (concentration - c_lo) + i_lo
            return max(0.0, min(index, float(SEVERE_CAP)))
    raise ValueError(f"no breakpoint band for {pollutant} concentration {concentration}")
