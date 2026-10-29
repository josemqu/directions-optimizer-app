import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTrafficProfile } from '../src/lib/traffic.ts';

test('selección por horario local, bordes y falta de horario', () => {
  const saved = { ...process.env };
  try {
    delete process.env.OSRM_TRAFFIC_ENABLED;
    assert.equal(selectTrafficProfile('08:00'), null);
    process.env.OSRM_TRAFFIC_ENABLED = 'true';
    process.env.OSRM_HABITUAL_URL = 'http://localhost:5002';
    process.env.OSRM_PEAK_URL = 'http://localhost:5003';
    for (const time of ['07:00', '08:59', '17:00', '19:59']) assert.equal(selectTrafficProfile(time).id, 'peak');
    for (const time of ['06:59', '09:00', '16:59', '20:00', null]) assert.equal(selectTrafficProfile(time).id, 'habitual');
    assert.match(selectTrafficProfile(null).label, /sin horario/);
    assert.throws(() => selectTrafficProfile('25:00'));
    delete process.env.OSRM_PEAK_URL;
    assert.throws(() => selectTrafficProfile('08:00'), /Falta configurar/);
  } finally { process.env = saved; }
});
