"""Prueba local reproducible con coordenadas sintéticas sobre calles reales.

Uso: python3 scripts/check_osrm_pilot.py [URL_APP] [URL_OSRM]
No llama a Google. La app debe iniciarse con ROUTING_PROVIDER=osrm.
"""

import json
import math
import statistics
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen


APP = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3101"
OSRM = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:5001"


def request(url, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = Request(url, data=data, headers={"Content-Type": "application/json"})
    start = time.perf_counter()
    try:
        with urlopen(req, timeout=30) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw), time.perf_counter() - start
    except HTTPError as error:
        return error.code, error.read().decode(), time.perf_counter() - start


def distance(a, b):
    lat1, lat2 = map(math.radians, (a["lat"], b["lat"]))
    dlat = lat2 - lat1
    dlon = math.radians(b["lng"] - a["lng"])
    return 6371000 * 2 * math.asin(math.sqrt(
        math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    ))


def main():
    stops = []
    for i in range(25):
        lat, lng = -38.005 + (i // 5) * 0.005, -57.59 + (i % 5) * 0.005
        status, data, _ = request(f"{OSRM}/nearest/v1/driving/{lng},{lat}?number=1")
        assert status == 200 and data["code"] == "Ok", data
        point = data["waypoints"][0]
        assert point["distance"] <= 200, point
        lon, lat = point["location"]
        stops.append({"id": str(i), "label": f"Prueba {i}", "position": {"lat": lat, "lng": lon}})

    measurements = []
    for count in (3, 10, 25):
        selected = stops[:count]
        coords = ";".join(f'{s["position"]["lng"]},{s["position"]["lat"]}' for s in selected)
        table_times = []
        for _ in range(5):
            status, matrix, elapsed = request(f"{OSRM}/table/v1/driving/{coords}?annotations=duration")
            assert status == 200 and matrix["code"] == "Ok", matrix
            assert len(matrix["durations"]) == count
            assert all(len(row) == count and all(v is not None and v >= 0 for v in row) for row in matrix["durations"])
            table_times.append(elapsed)

        status, result, elapsed = request(f"{APP}/api/optimize", {
            "stops": selected, "startTime": "09:00", "serviceTimeMinutes": 1,
        })
        assert status == 200, (status, result)
        ids = result["orderedStopIds"]
        assert len(ids) == count and set(ids) == {s["id"] for s in selected}
        assert ids[0] == "0"
        assert len(result["legDurationsSeconds"]) == count - 1
        assert len(result["routeLine"]) > count
        lookup = {s["id"]: s for s in selected}
        assert distance(result["routeLine"][0], lookup[ids[0]]["position"]) < 200
        assert distance(result["routeLine"][-1], lookup[ids[-1]]["position"]) < 200
        measurements.append({"points": count, "table_median_ms": round(statistics.median(table_times) * 1000, 2),
                             "optimize_ms": round(elapsed * 1000, 2), "geometry_points": len(result["routeLine"]),
                             "travel_seconds": sum(result["legDurationsSeconds"])})

    constrained = json.loads(json.dumps(stops[:3]))
    constrained[1].update(timeRestriction="09:40", timeRestrictionType="before")
    constrained[2].update(timeRestriction="09:10", timeRestrictionType="after")
    status, result, _ = request(f"{APP}/api/optimize", {
        "stops": constrained, "startTime": "09:00", "serviceTimeMinutes": 2,
    })
    assert status == 200, (status, result)
    # Verifica que el orden devuelto permite cumplir los horarios y la atención.
    lookup = {s["id"]: s for s in constrained}
    clock = 9 * 3600
    for index, stop_id in enumerate(result["orderedStopIds"][1:]):
        clock += result["legDurationsSeconds"][index]
        stop = lookup[stop_id]
        h, m = map(int, stop["timeRestriction"].split(":"))
        bound = h * 3600 + m * 60
        if stop["timeRestrictionType"] == "after":
            clock = max(clock, bound)
        else:
            assert clock <= bound, (clock, stop)
        clock += 120

    impossible = json.loads(json.dumps(stops[:3]))
    impossible[1].update(timeRestriction="08:00", timeRestrictionType="before")
    status, _, _ = request(f"{APP}/api/optimize", {"stops": impossible, "startTime": "09:00"})
    assert status == 422, status

    outside = json.loads(json.dumps(stops[:3]))
    outside[1]["position"] = {"lat": -34.6, "lng": -58.4}
    status, _, _ = request(f"{APP}/api/optimize", {"stops": outside})
    assert status == 422, status

    status, _, _ = request(f"{APP}/api/optimize", {"stops": stops + [dict(stops[0], id="26")]})
    assert status == 400, status

    coincident = [dict(stops[0], id=str(i)) for i in range(3)]
    status, result, _ = request(f"{APP}/api/optimize", {"stops": coincident, "startTime": "09:00"})
    assert status == 200 and result["legDurationsSeconds"] == [0, 0], (status, result)
    print(json.dumps({"measurements": measurements, "checks": ["visitas completas", "origen fijo", "trazado por calles",
          "horarios y atención", "horario imposible", "fuera de cobertura", "máximo de puntos", "puntos coincidentes"]}, indent=2))


if __name__ == "__main__":
    main()
