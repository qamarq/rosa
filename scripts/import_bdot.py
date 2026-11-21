import os
import re
import subprocess
import sys
import time
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://opendata.geoportal.gov.pl/bdot10k/schemat2021/GPKG"
LAYERS = [("OT_SWRM_L", "rów", "NULL"), ("OT_SWRS_L", "ciek", "NULL"), ("OT_SWKN_L", "kanał", "NULL"), ("OT_PTWP_A", "woda", "RODZAJ")]
WORK = os.environ.get("WORK", "/work")
PG = f"PG:host={os.environ['PGHOST']} dbname=postgres user=postgres"
ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))


def fetch(url, dest=None, tries=4):
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                if dest is None:
                    return r.read()
                with open(dest, "wb") as f:
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
                return dest
        except Exception:
            if attempt == tries - 1:
                raise
            time.sleep(3 * (attempt + 1))


def county_urls():
    with open(os.environ.get("CODES_FILE", os.path.join(WORK, "codes.txt"))) as f:
        codes = sorted({c.strip() for c in f.read().replace("\n", ",").split(",") if re.fullmatch(r"\d{4}", c.strip())})
    return [f"{BASE}/{c[:2]}/{c}_GPKG.zip" for c in codes if not ONLY or c in ONLY]


def process(url):
    code = os.path.basename(url)[:4]
    path = os.path.join(WORK, f"{code}.zip")
    try:
        fetch(url, path)
        members = zipfile.ZipFile(path).namelist()
        counts = []
        for layer, kind, sub in LAYERS:
            member = next((m for m in members if m.endswith(f"__{layer}.gpkg")), None)
            if not member:
                continue
            sql = f"SELECT geometria AS geom, '{kind}' AS kind, {sub} AS subkind, NAZWA AS name, TERYT AS teryt FROM {layer}"
            r = subprocess.run(
                ["ogr2ogr", "-append", "-f", "PostgreSQL", PG, f"/vsizip/{path}/{member}", "-nln", "hydro_feature",
                 "-dim", "XY", "-dialect", "SQLite", "-sql", sql, "--config", "PG_USE_COPY", "YES", "-gt", "50000"],
                capture_output=True, text=True,
            )
            if r.returncode != 0:
                return f"FAIL {code} {layer}: {r.stderr.strip()[:200]}"
            counts.append(layer)
        return f"ok {code} {len(counts)} layers"
    except Exception as e:
        return f"FAIL {code}: {e}"
    finally:
        if os.path.exists(path):
            os.remove(path)


def main():
    urls = county_urls()
    print(f"counties: {len(urls)}", flush=True)
    done = 0
    with ThreadPoolExecutor(int(os.environ.get("JOBS", "6"))) as ex:
        for fut in as_completed([ex.submit(process, u) for u in urls]):
            done += 1
            print(f"[{done}/{len(urls)}] {fut.result()}", flush=True)
    print("IMPORT DONE", flush=True)


if __name__ == "__main__":
    sys.exit(main())
