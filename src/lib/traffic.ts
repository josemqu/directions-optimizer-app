// Horas locales del reparto (HH:mm), sin inferir fecha ni temporada.
export function selectTrafficProfile(startTime: string | null) {
  if (process.env.OSRM_TRAFFIC_ENABLED !== "true") return null;
  if (startTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    throw new Error("El horario de salida debe tener formato HH:mm.");
  }
  const hour = startTime === null ? null : Number(startTime.slice(0, 2));
  const peak = hour !== null && ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 20));
  const id = peak ? "peak" : "habitual";
  const baseUrl = peak ? process.env.OSRM_PEAK_URL : process.env.OSRM_HABITUAL_URL;
  if (!baseUrl) throw new Error(`Falta configurar el motor OSRM del perfil ${id}.`);
  return {
    id, baseUrl,
    label: `${peak ? "Hora pico" : "Habitual"} · estimación sin calibrar${hour === null ? " · sin horario de salida" : ""}`,
  };
}
