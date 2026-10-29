import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { computeOsrmMatrix, computeOsrmPolyline } from "../src/lib/osrm.ts";

const locations = [{ lat: -38, lng: -57.56 }, { lat: -38.01, lng: -57.57 }];
const originalFetch = globalThis.fetch;
const originalBase = process.env.OSRM_BASE_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBase === undefined) delete process.env.OSRM_BASE_URL;
  else process.env.OSRM_BASE_URL = originalBase;
});

function respond(payload, status = 200) {
  process.env.OSRM_BASE_URL = "http://127.0.0.1:5001";
  globalThis.fetch = async (url, options) => {
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal);
    assert.equal(url.searchParams.get("radiuses"), "200;200");
    return Response.json(payload, { status });
  };
}

test("conserva asimetría, segundos y tiempos cero entre puntos coincidentes", async () => {
  respond({ code: "Ok", durations: [[0, 0], [25.4, 0]] });
  const result = await computeOsrmMatrix(locations);
  assert.equal(result[1].duration, "0s");
  assert.equal(result[2].duration, "25s");
  assert.equal(result[2].originIndex, 1);
  assert.equal(result[2].destinationIndex, 0);
});

test("rechaza pares desconectados en lugar de inventar tiempos", async () => {
  respond({ code: "Ok", durations: [[0, null], [null, 0]] });
  await assert.rejects(computeOsrmMatrix(locations), { status: 422 });
});

test("rechaza matrices incompletas o con tiempos negativos", async () => {
  for (const durations of [[[0]], [[0, 1], [-2, 0]]]) {
    respond({ code: "Ok", durations });
    await assert.rejects(computeOsrmMatrix(locations), { status: 502 });
  }
});

test("convierte GeoJSON longitud/latitud sin alterar el trazado", async () => {
  respond({ code: "Ok", routes: [{ geometry: {
    type: "LineString", coordinates: [[-57.56, -38], [-57.57, -38.01]],
  } }] });
  assert.deepEqual(await computeOsrmPolyline(locations), locations);
});

test("no sustituye geometrías ausentes por segmentos rectos", async () => {
  respond({ code: "Ok", routes: [] });
  await assert.rejects(computeOsrmPolyline(locations), { status: 502 });
});

test("puntos sin calle cercana producen error explícito", async () => {
  respond({ code: "NoSegment" }, 400);
  await assert.rejects(computeOsrmMatrix(locations), { status: 422 });
});

test("rechaza puntos fuera de cobertura antes de consultar la red", async () => {
  globalThis.fetch = () => assert.fail("No debe haber consultas");
  await assert.rejects(computeOsrmMatrix([locations[0], { lat: -34.6, lng: -58.4 }]), { status: 422 });
});

test("motor caído genera un solo intento y ningún fallback a Google", async () => {
  process.env.OSRM_BASE_URL = "http://127.0.0.1:5001";
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url.hostname);
    throw new TypeError("connection refused");
  };
  await assert.rejects(computeOsrmMatrix(locations), { status: 503 });
  assert.deepEqual(calls, ["127.0.0.1"]);
});

test("exige configurar un motor explícito", async () => {
  delete process.env.OSRM_BASE_URL;
  globalThis.fetch = () => assert.fail("No debe haber consultas");
  await assert.rejects(computeOsrmMatrix(locations), { status: 500 });
});
