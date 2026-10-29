"""Recorta caminos completos y restricciones de giro para el piloto local.

Uso: python scripts/extract_osrm_pilot.py entrada.osm.pbf salida.osm.pbf
Requiere osmium==4.3.2 (solo para preparar los datos).
"""

import sys

import osmium

# Margen adicional alrededor de la cobertura admitida por la aplicación.
BOUNDS = (-58.3, -38.4, -57.3, -37.65)


def main(source, destination):
    west, south, east, north = BOUNDS
    node_ids = set()
    for node in osmium.FileProcessor(source, osmium.osm.NODE):
        if node.location.valid() and west <= node.lon <= east and south <= node.lat <= north:
            node_ids.add(node.id)

    way_ids = set()
    with osmium.BackReferenceWriter(destination, source, remove_tags=False) as writer:
        for way in osmium.FileProcessor(source, osmium.osm.WAY):
            if "highway" in way.tags and any(node.ref in node_ids for node in way.nodes):
                way_ids.add(way.id)
                writer.add(way)
        for relation in osmium.FileProcessor(source, osmium.osm.RELATION):
            if relation.tags.get("type") == "restriction" and any(
                member.type == "w" and member.ref in way_ids for member in relation.members
            ):
                writer.add(relation)
    print(f"Caminos seleccionados: {len(way_ids)}; límites del recorte: {BOUNDS}")


if __name__ == "__main__":
    main(*sys.argv[1:])
