#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
image="ghcr.io/project-osrm/osrm-backend:v5.27.1"
source_url="https://download.openstreetmap.fr/extracts/south-america/argentina/buenos_aires-latest.osm.pbf"

case "${1:-status}" in
  prepare)
    if [[ -n "$(docker compose -f compose.osrm.yml ps --status running -q)" ]]; then
      echo "Detené OSRM antes de regenerar datos: bash scripts/osrm-local.sh stop" >&2
      exit 1
    fi
    mkdir -p .local/osrm
    python3 -m venv .local/pilot-venv
    .local/pilot-venv/bin/python -m pip install osmium==4.3.2 -r requirements.txt
    docker pull "$image"
    if [[ ! -f .local/osrm/buenos-aires.osm.pbf ]]; then
      curl -fL --retry 2 "$source_url" -o .local/osrm/buenos-aires.osm.pbf.download
      mv .local/osrm/buenos-aires.osm.pbf.download .local/osrm/buenos-aires.osm.pbf
    fi
    if [[ ! -f .local/osrm/mdp.osm.pbf ]]; then
      .local/pilot-venv/bin/python scripts/extract_osrm_pilot.py \
        .local/osrm/buenos-aires.osm.pbf .local/osrm/mdp.osm.pbf
    fi
    docker run --rm --memory=2g --cpus=2 -v "$root/.local/osrm:/data" "$image" \
      osrm-extract -t 2 -p /opt/car.lua /data/mdp.osm.pbf
    docker run --rm --memory=2g --cpus=2 -v "$root/.local/osrm:/data" "$image" \
      osrm-partition -t 2 /data/mdp.osrm
    docker run --rm --memory=2g --cpus=2 -v "$root/.local/osrm:/data" "$image" \
      osrm-customize -t 2 /data/mdp.osrm
    .local/pilot-venv/bin/python - <<'PY'
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import osmium

source = Path('.local/osrm/buenos-aires.osm.pbf')
with osmium.io.Reader(str(source)) as reader:
    timestamp = reader.header().get('osmosis_replication_timestamp')
with source.open('rb') as stream:
    sha256 = hashlib.file_digest(stream, 'sha256').hexdigest()
manifest = {
    'source': 'https://download.openstreetmap.fr/extracts/south-america/argentina/buenos_aires-latest.osm.pbf',
    'source_timestamp_utc': timestamp, 'source_sha256': sha256,
    'prepared_at_utc': datetime.now(timezone.utc).isoformat(),
    'extract_bbox_lon_lat': [-58.3, -38.4, -57.3, -37.65],
    'application_bbox_lon_lat': [-58.15, -38.2, -57.45, -37.9],
    'osrm_image': 'ghcr.io/project-osrm/osrm-backend:v5.27.1',
}
Path('.local/osrm/data-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
PY
    ;;
  start)
    if [[ ! -f .local/osrm/mdp.osrm.mldgr ]]; then
      echo "Primero ejecutá: bash scripts/osrm-local.sh prepare" >&2
      exit 1
    fi
    docker compose -f compose.osrm.yml up -d
    ;;
  app)
    if [[ ! -x .local/pilot-venv/bin/python ]]; then
      echo "Primero ejecutá: bash scripts/osrm-local.sh prepare" >&2
      exit 1
    fi
    export PYTHON_BIN="$root/.local/pilot-venv/bin/python"
    export NEXT_DIST_DIR=.next-pilot
    export ROUTING_PROVIDER=osrm
    export OSRM_BASE_URL=http://127.0.0.1:5001
    export GOOGLE_ROUTES_API_KEY=''
    exec pnpm dev --hostname 127.0.0.1 --port 3101
    ;;
  stop)
    docker compose -f compose.osrm.yml stop
    ;;
  status)
    docker compose -f compose.osrm.yml ps
    ;;
  *)
    echo "Uso: bash scripts/osrm-local.sh {prepare|start|app|stop|status}" >&2
    exit 1
    ;;
esac
