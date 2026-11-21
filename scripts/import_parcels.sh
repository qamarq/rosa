#!/usr/bin/env bash
# Usage: PGHOST=... PGPASSWORD=... ./import_parcels.sh /path/to/workdir
set -euo pipefail
WORK=${1:-$PWD}
URL="https://opendata.geoportal.gov.pl/InneDane/latest_exports/eziudp_wfs/PARQUET/0_dzialki.parquet"

curl -sS -L -C - -o "$WORK/0_dzialki.parquet" "$URL"

docker run --rm --network "${DOCKER_NETWORK:-host}" -e PGPASSWORD -v "$WORK":/data ghcr.io/osgeo/gdal:ubuntu-full-latest \
  ogr2ogr -f PostgreSQL "PG:host=${PGHOST} dbname=${PGDATABASE:-postgres} user=${PGUSER:-postgres}" /data/0_dzialki.parquet \
  -nln dzialki -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -lco FID=fid -lco SPATIAL_INDEX=NONE \
  --config PG_USE_COPY YES -gt 100000

psql "host=${PGHOST} dbname=${PGDATABASE:-postgres} user=${PGUSER:-postgres}" <<'SQL'
SET maintenance_work_mem = '1GB';
CREATE INDEX IF NOT EXISTS dzialki_id_dzialki_idx ON dzialki (id_dzialki);
CREATE INDEX IF NOT EXISTS dzialki_geom_idx ON dzialki USING gist (geom);
ANALYZE dzialki;
SQL
