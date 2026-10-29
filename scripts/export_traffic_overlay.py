"""Exporta velocidades de los CSV preparados y geometría del mismo mapa OSM."""
import csv
import json
from pathlib import Path
import osmium

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / '.local/osrm'


def export_overlay():
    profiles = {}
    manifests = {}
    for name in ['habitual', 'peak']:
        manifests[name] = json.loads((DATA / name / 'traffic-manifest.json').read_text())
        with (DATA / name / 'speeds.csv').open() as stream:
            profiles[name] = {(int(a), int(b)): float(speed) for a, b, speed in csv.reader(stream)}
    if manifests['habitual']['map_manifest'] != manifests['peak']['map_manifest']:
        raise ValueError('Los perfiles corresponden a mapas diferentes; regenerarlos juntos.')
    features = []

    class Streets(osmium.SimpleHandler):
        def way(self, way):
            points = list(way.nodes)
            if len(points) < 2 or not all(p.location.valid() for p in points):
                return
            # Cobertura admitida por el piloto, sin mostrar el margen regional.
            if not any(-58.15 <= p.lon <= -57.45 and -38.2 <= p.lat <= -37.9 for p in points):
                return
            values = {}
            for name, speeds in profiles.items():
                forward = speeds.get((points[0].ref, points[1].ref))
                backward = speeds.get((points[1].ref, points[0].ref))
                if forward is None or backward is None:
                    return
                values[name] = [forward, backward]
            features.append({'type': 'Feature', 'geometry': {
                'type': 'LineString', 'coordinates': [[p.lon, p.lat] for p in points]},
                'properties': {'name': way.tags.get('name', 'Calle sin nombre'),
                               'highway': way.tags.get('highway'), 'osmId': str(way.id),
                               'oneway': way.tags.get('oneway', 'no'), 'reasons': manifests['habitual'].get('reasons_by_way', {}).get(str(way.id), []), **values}})

    Streets().apply_file(str(DATA / 'mdp.osm.pbf'), locations=True)
    output = {'type': 'FeatureCollection', 'features': features,
              'metadata': {'profiles': manifests, 'description': 'Velocidades propuestas en los CSV; OSRM aplica además accesos y restricciones del mapa.'}}
    target = DATA / 'traffic-overlay.geojson'
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(output, separators=(',', ':'), ensure_ascii=False))
    temp.replace(target)
    print(f'Overlay: {len(features)} calles, {target.stat().st_size} bytes')


if __name__ == '__main__':
    export_overlay()
