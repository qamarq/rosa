import csv
import io
import os
import re
import sys
import time
import urllib.request
import zipfile
from datetime import date

import psycopg

BASE = "https://danepubliczne.imgw.pl/data/dane_pomiarowo_obserwacyjne/dane_meteorologiczne/dobowe/"
STATIONS_URL = "https://danepubliczne.imgw.pl/datastore/getfiledown/Arch/Telemetria/Meteo/kody_stacji.csv"
FIRST_YEAR = int(os.environ.get("IMGW_FIRST_YEAR", "2006"))
LAST_YEAR = date.today().year
KINDS = {
    "synop": {"prefix": "s", "precip": 13, "tmax": 5, "tmin": 7, "sun": 20, "priority": 3},
    "klimat": {"prefix": "k", "precip": 13, "tmax": 5, "tmin": 7, "sun": None, "priority": 2},
    "opad": {"prefix": "o", "precip": 5, "tmax": None, "tmin": None, "sun": None, "priority": 1},
}


def fetch(url, tries=4):
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return r.read()
        except Exception as e:
            if attempt == tries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def list_zips(kind, year):
    html = fetch(f"{BASE}{kind}/{year}/").decode("utf-8", "replace")
    return sorted(set(re.findall(r'href="([^"?/]+\.zip)"', html)))


def num(value, status):
    value = value.strip()
    if status.strip() == "8":
        return None
    if value == "":
        return 0.0 if status.strip() == "9" else None
    try:
        return float(value.replace(",", "."))
    except ValueError:
        return None


def parse_dms(text):
    parts = [p for p in re.split(r"[^0-9.]+", text.strip()) if p]
    if len(parts) < 2:
        return None
    d, m = float(parts[0]), float(parts[1])
    s = float(parts[2]) if len(parts) > 2 else 0.0
    return d + m / 60 + s / 3600


def rows_from_zip(kind, blob):
    cfg = KINDS[kind]
    member_re = re.compile(rf"^{cfg['prefix']}_d_(?!t_).*\.csv$", re.I)
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        for name in zf.namelist():
            if not member_re.match(os.path.basename(name)):
                continue
            text = zf.read(name).decode("cp1250", "replace")
            for r in csv.reader(io.StringIO(text)):
                if len(r) < 7:
                    continue
                try:
                    day = date(int(r[2]), int(r[3]), int(r[4]))
                except ValueError:
                    continue
                code = r[0].strip()
                pick = lambda key: num(r[cfg[key]], r[cfg[key] + 1]) if cfg[key] is not None and len(r) > cfg[key] + 1 else None
                yield code, r[1].strip(), day, pick("precip"), pick("tmax"), pick("tmin"), pick("sun"), cfg["priority"]


def main():
    dsn = os.environ["DATABASE_URL"]
    stations_csv = fetch(STATIONS_URL).decode("utf-8", "replace")
    coords = {}
    for r in csv.reader(io.StringIO(stations_csv), delimiter=";"):
        if len(r) < 8 or not r[1].strip().isdigit():
            continue
        lat, lon = parse_dms(r[5]), parse_dms(r[6])
        if lat and lon:
            elev = int(r[7]) if r[7].strip().isdigit() else None
            coords[r[1].strip()] = (r[2].strip(), lat, lon, elev)
    print(f"telemetry stations with coordinates: {len(coords)}", flush=True)

    with psycopg.connect(dsn, autocommit=True) as conn:
        conn.execute("DROP TABLE IF EXISTS meteo_daily_stage")
        conn.execute(
            "CREATE UNLOGGED TABLE meteo_daily_stage (code text, name text, day date, precip real, tmax real, tmin real, sun real, priority int)"
        )
        total = 0
        for kind in KINDS:
            for year in range(FIRST_YEAR, LAST_YEAR + 1):
                try:
                    zips = list_zips(kind, year)
                except Exception as e:
                    print(f"skip {kind} {year}: {e}", flush=True)
                    continue
                n = 0
                with conn.cursor() as cur, cur.copy("COPY meteo_daily_stage FROM STDIN") as cp:
                    for z in zips:
                        blob = fetch(f"{BASE}{kind}/{year}/{z}")
                        for row in rows_from_zip(kind, blob):
                            cp.write_row(row)
                            n += 1
                total += n
                print(f"{kind} {year}: {len(zips)} zips, {n} rows (total {total})", flush=True)

        print("merging", flush=True)
        conn.execute("CREATE TEMP TABLE coords (code text primary key, name text, lat float8, lon float8, elev int)")
        with conn.cursor() as cur, cur.copy("COPY coords FROM STDIN") as cp:
            for code, (name, lat, lon, elev) in coords.items():
                cp.write_row((code, name, lat, lon, elev))
        conn.execute("TRUNCATE meteo_daily, meteo_station")
        conn.execute(
            """
            INSERT INTO meteo_station (code, name, lat, lon, elevation_m, has_temperature, geom)
            SELECT s.code, coalesce(c.name, s.name), c.lat, c.lon, c.elev, s.has_temp, ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326)
            FROM (
              SELECT code, max(name) AS name, (count(tmax) > 0)::int AS has_temp
              FROM meteo_daily_stage GROUP BY code
            ) s JOIN coords c USING (code)
            """
        )
        conn.execute(
            """
            INSERT INTO meteo_daily (station_code, day, precip_mm, tmax_c, tmin_c, sunshine_h, source)
            SELECT code, day,
                   (array_agg(precip ORDER BY priority DESC) FILTER (WHERE precip IS NOT NULL))[1],
                   (array_agg(tmax ORDER BY priority DESC) FILTER (WHERE tmax IS NOT NULL))[1],
                   (array_agg(tmin ORDER BY priority DESC) FILTER (WHERE tmin IS NOT NULL))[1],
                   (array_agg(sun ORDER BY priority DESC) FILTER (WHERE sun IS NOT NULL))[1],
                   CASE max(priority) WHEN 3 THEN 'synop' WHEN 2 THEN 'klimat' ELSE 'opad' END
            FROM meteo_daily_stage
            WHERE code IN (SELECT code FROM meteo_station)
            GROUP BY code, day
            """
        )
        unmatched = conn.execute(
            "SELECT count(DISTINCT code) FROM meteo_daily_stage WHERE code NOT IN (SELECT code FROM meteo_station)"
        ).fetchone()[0]
        conn.execute("DROP TABLE meteo_daily_stage")
        conn.execute("ANALYZE meteo_station")
        conn.execute("ANALYZE meteo_daily")
        stations, temp_stations = conn.execute("SELECT count(*), sum(has_temperature) FROM meteo_station").fetchone()
        days, size = conn.execute(
            "SELECT count(*), pg_size_pretty(pg_total_relation_size('meteo_daily')) FROM meteo_daily"
        ).fetchone()
        print(f"DONE stations={stations} with_temperature={temp_stations} unmatched_codes={unmatched} rows={days} size={size}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
