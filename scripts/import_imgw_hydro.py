import csv
import io
import json
import os
import re
import sys
import time
import urllib.request
import zipfile
from datetime import date

import psycopg

BASE = "https://danepubliczne.imgw.pl/data/dane_pomiarowo_obserwacyjne/dane_hydrologiczne/dobowe/"
STATIONS_URL = "https://danepubliczne.imgw.pl/api/data/hydro"
FIRST_YEAR = int(os.environ.get("IMGW_HYDRO_FIRST_YEAR", "2006"))
SUFFIX = os.environ.get("TABLE_SUFFIX", "")
DAILY = f"hydro_gauge_daily{SUFFIX}"
GAUGE = f"hydro_gauge{SUFFIX}"


def fetch(url, tries=4):
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return r.read()
        except Exception:
            if attempt == tries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def list_years():
    html = fetch(BASE).decode("utf-8", "replace")
    return sorted(y for y in {int(v) for v in re.findall(r'href="(\d{4})/"', html)} if y >= FIRST_YEAR)


def list_zips(year):
    html = fetch(f"{BASE}{year}/").decode("utf-8", "replace")
    return sorted(set(re.findall(r'href="(codz_[^"?/]+\.zip)"', html)))


def decode(blob):
    if blob.startswith(b"\xef\xbb\xbf"):
        return blob[3:].decode("utf-8", "replace")
    try:
        return blob.decode("utf-8")
    except UnicodeDecodeError:
        return blob.decode("cp1250", "replace")


def num(text, missing):
    text = text.strip()
    if text == "" or text.upper() == "NULL":
        return None
    try:
        value = float(text)
    except ValueError:
        return None
    return None if value >= missing else value


def intval(text):
    try:
        return int(float(text)) if text not in (None, "") else None
    except ValueError:
        return None


def rows_from_zip(blob):
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        for name in zf.namelist():
            if not name.lower().endswith(".csv"):
                continue
            text = decode(zf.read(name))
            head = text[:500]
            delimiter = ";" if head.count(";") > head.count(",") else ","
            for r in csv.reader(io.StringIO(text), delimiter=delimiter):
                if len(r) == 1 and delimiter in r[0]:
                    r = next(csv.reader([r[0]], delimiter=delimiter))
                if len(r) < 10:
                    continue
                try:
                    hydro_year, month, day = int(r[3]), int(r[9]), int(r[5])
                    when = date(hydro_year - 1 if month >= 11 else hydro_year, month, day)
                except ValueError:
                    continue
                level, flow = num(r[6], 9999), num(r[7], 99999)
                if level is None and flow is None:
                    continue
                yield r[0].strip(), when, level, flow


def main():
    dsn = os.environ["DATABASE_URL"]
    stations = json.loads(fetch(STATIONS_URL))
    print(f"API stations: {len(stations)}", flush=True)

    with psycopg.connect(dsn, autocommit=True) as conn:
        conn.execute("DROP TABLE IF EXISTS hydro_gauge_daily_stage")
        conn.execute("CREATE UNLOGGED TABLE hydro_gauge_daily_stage (code text, day date, level real, flow real)")
        total = 0
        for year in list_years():
            zips = list_zips(year)
            n = 0
            with conn.cursor() as cur, cur.copy("COPY hydro_gauge_daily_stage FROM STDIN") as cp:
                for z in zips:
                    for row in rows_from_zip(fetch(f"{BASE}{year}/{z}")):
                        cp.write_row(row)
                        n += 1
            total += n
            print(f"{year}: {len(zips)} zips, {n} rows (total {total})", flush=True)

        print("merging", flush=True)
        conn.execute("CREATE TEMP TABLE api_gauge (code text primary key, name text, river text, lat float8, lon float8, warning int, alarm int)")
        with conn.cursor() as cur, cur.copy("COPY api_gauge FROM STDIN") as cp:
            seen = set()
            for s in stations:
                code = (s.get("id_stacji") or "").strip()
                try:
                    lat, lon = float(s["lat"]), float(s["lon"])
                except (TypeError, ValueError, KeyError):
                    continue
                if not code or code in seen:
                    continue
                seen.add(code)
                cp.write_row((code, (s.get("stacja") or code).strip(), (s.get("rzeka") or "").strip() or None, lat, lon, intval(s.get("stan_ostrzegawczy")), intval(s.get("stan_alarmowy"))))
        conn.execute(f"TRUNCATE {DAILY}, {GAUGE}")
        conn.execute(
            f"""
            INSERT INTO {GAUGE} (code, name, river, lat, lon, warning_cm, alarm_cm, geom)
            SELECT a.code, a.name, a.river, a.lat, a.lon, a.warning, a.alarm, ST_SetSRID(ST_MakePoint(a.lon, a.lat), 4326)
            FROM api_gauge a
            WHERE EXISTS (SELECT 1 FROM hydro_gauge_daily_stage s WHERE s.code = a.code)
            """
        )
        conn.execute(
            f"""
            INSERT INTO {DAILY} (code, day, level_cm, flow_m3s)
            SELECT DISTINCT ON (code, day) code, day, level, flow
            FROM hydro_gauge_daily_stage
            WHERE code IN (SELECT code FROM {GAUGE})
            ORDER BY code, day, (level IS NULL), (flow IS NULL)
            """
        )
        unmatched = conn.execute(
            f"SELECT count(DISTINCT code) FROM hydro_gauge_daily_stage WHERE code NOT IN (SELECT code FROM {GAUGE})"
        ).fetchone()[0]
        conn.execute("DROP TABLE hydro_gauge_daily_stage")
        conn.execute(f"ANALYZE {GAUGE}")
        conn.execute(f"ANALYZE {DAILY}")
        gauges = conn.execute(f"SELECT count(*) FROM {GAUGE}").fetchone()[0]
        days, first, last, size = conn.execute(
            f"SELECT count(*), min(day), max(day), pg_size_pretty(pg_total_relation_size('{DAILY}')) FROM {DAILY}"
        ).fetchone()
        print(f"DONE gauges={gauges} unmatched_codes={unmatched} rows={days} range={first}..{last} size={size}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
