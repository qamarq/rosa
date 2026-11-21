#!/usr/bin/env bash
# Background data refresh for ROSA. Usage: rosa-update.sh imgw|bdot|parcels|cache
# Config: ~/rosa-data/rosa.env with DB_CONTAINER=<postgis container name>
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
DATA=${ROSA_DATA:-$HOME/rosa-data}
source "$DATA/rosa.env"
LOG="$DATA/logs/$1-$(date +%Y%m%d-%H%M).log"
mkdir -p "$DATA/logs"
exec > >(tee -a "$LOG") 2>&1

PW=$(sudo docker inspect "$DB_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')
GDAL=ghcr.io/osgeo/gdal:ubuntu-full-latest

psql_db() { sudo docker exec -i "$DB_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 "$@"; }

prepare_next() {
  for t in "$@"; do psql_db -c "DROP TABLE IF EXISTS ${t}_next; CREATE TABLE ${t}_next (LIKE ${t} INCLUDING ALL);"; done
}

swap_next() {
  local sql="BEGIN;"
  for t in "$@"; do
    sql+=" DROP TABLE ${t}; ALTER TABLE ${t}_next RENAME TO ${t};"
  done
  sql+=" DO \$\$ DECLARE r record; BEGIN FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%_next%' LOOP EXECUTE format('ALTER INDEX %I RENAME TO %I', r.indexname, replace(r.indexname, '_next', '')); END LOOP; END \$\$; COMMIT;"
  psql_db -c "$sql"
}

echo "[$(date -Is)] start $1"
case "$1" in
  imgw)
    prepare_next meteo_station meteo_daily
    sudo docker run --rm --network coolify -e TABLE_SUFFIX=_next \
      -e DATABASE_URL="postgresql://postgres:$PW@$DB_CONTAINER:5432/postgres" \
      -v "$HERE/..:/w" python:3.12-slim sh -c "pip install -q 'psycopg[binary]' 2>/dev/null; python -u /w/import_imgw.py"
    swap_next meteo_station meteo_daily
    ;;
  bdot)
    prepare_next hydro_feature
    mkdir -p "$DATA/bdot"
    psql_db -tAc "WITH RECURSIVE t AS (SELECT min(id_dzialki) AS v FROM dzialki UNION ALL SELECT (SELECT min(id_dzialki) FROM dzialki WHERE id_dzialki > left(t.v,4) || '~') FROM t WHERE t.v IS NOT NULL) SELECT string_agg(DISTINCT left(v,4), ',') FROM t WHERE v IS NOT NULL" > "$DATA/bdot/codes.txt"
    sudo docker run --rm --network coolify -e PGHOST="$DB_CONTAINER" -e PGPASSWORD="$PW" -e TABLE=hydro_feature_next -e JOBS=6 \
      -v "$DATA/bdot:/work" -v "$HERE/..:/s" $GDAL python3 -u /s/import_bdot.py
    psql_db -c "ANALYZE hydro_feature_next"
    swap_next hydro_feature
    ;;
  parcels)
    curl -sS -L -o "$DATA/0_dzialki.parquet" "https://opendata.geoportal.gov.pl/InneDane/latest_exports/eziudp_wfs/PARQUET/0_dzialki.parquet"
    psql_db -c "DROP TABLE IF EXISTS dzialki_next"
    sudo docker run --rm --network coolify -e PGPASSWORD="$PW" -v "$DATA:/data" $GDAL \
      ogr2ogr -f PostgreSQL "PG:host=$DB_CONTAINER dbname=postgres user=postgres" /data/0_dzialki.parquet \
      -nln dzialki_next -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -lco FID=fid -lco SPATIAL_INDEX=NONE \
      --config PG_USE_COPY YES -gt 100000
    psql_db -c "SET maintenance_work_mem = '1GB'; CREATE INDEX dzialki_next_id_dzialki_idx ON dzialki_next (id_dzialki); CREATE INDEX dzialki_next_geom_idx ON dzialki_next USING gist (geom); ANALYZE dzialki_next;"
    swap_next dzialki
    rm -f "$DATA/0_dzialki.parquet"
    ;;
  cache)
    psql_db -c "DELETE FROM rosa_cache WHERE expires_at IS NOT NULL AND expires_at < now()"
    ;;
  *)
    echo "unknown job: $1"; exit 2 ;;
esac
echo "[$(date -Is)] done $1"
