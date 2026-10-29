# Reemplazo de Google Routes: piloto local

## Alcance acordado

El usuario confirmó conservar OR-Tools y orientar el trabajo a reducir el costo y la dependencia de Google. La primera versión mantendrá un vehículo, hasta 25 puntos totales incluido el origen, restricciones de llegada antes/después de una hora y tiempo de atención por parada.

También confirmó usar estimaciones por calles sin tráfico en vivo, limitar la cobertura inicial a Mar del Plata y alrededores y evaluar un pequeño costo mensual de infraestructura sin contratar todavía. Las restricciones horarias seguirán siendo obligatorias sobre los tiempos estimados; no constituyen una garantía de puntualidad real.

El techo inicial de evaluación es de US$10 mensuales para infraestructura adicional; su viabilidad todavía debe medirse y cotizarse. Antes de cambiar producción se validarán recorridos conocidos: visitas completas, horarios, trazados por calles y tiempos de respuesta, comparando diferencias con Google. Si el nuevo motor falla, se conservarán las paradas y se permitirá reintentar sin consultar automáticamente a Google.

## Situación verificada en el código

- `src/app/api/optimize/route.ts` obtiene de Google Routes una matriz completa de tiempos por calles con `TRAFFIC_AWARE` y, después de optimizar, el trazado del recorrido.
- `scripts/optimize_ortools.py` y `api/solve_ortools.py` contienen el solver OR-Tools para ejecución local y Vercel respectivamente. El presupuesto de búsqueda es de cinco segundos.
- El origen está fijo; el destino final es libre. No se exige volver al origen.
- El límite actual de 25 puntos proviene del control de 625 elementos de la matriz; no es un límite intrínseco de OR-Tools.
- Se eliminó de ambos solvers la regla adicional de ordenar por vencimiento, con confirmación del usuario. Se conserva el cumplimiento de horarios; una regresión verifica un caso donde visitar primero el plazo más tardío es la única solución factible.
- Se actualizó `README.md` para reflejar la integración actual; `README-project.md` quedó marcado como propuesta histórica.

## Decisiones pendientes

- Medir recursos y latencia, precisar cobertura y carga, elegir alojamiento y definir umbrales de aceptación para producción a partir del piloto.
- Comparar recorridos operativos conocidos y precisar el mantenimiento del mapa antes de habilitar producción.

El usuario confirmó probar OSRM local para matriz y trazado. El piloto está implementado; se pueden consultar sus [instrucciones y resultados](piloto-osrm-local.md). No se contrató infraestructura ni se reemplazaron llamadas en producción.

## Propuesta para el siguiente paso

Piloto local con OSRM y datos de OpenStreetMap de la zona, conservando OR-Tools. Integrar matriz y trazado mediante un proveedor configurable, de modo que la transición sea explícita y reversible, sin fallback automático a Google. Medir memoria, almacenamiento y tiempos con 3, 10 y 25 puntos, además de restricciones factibles e imposibles y fallos del motor. Registrar fecha y cobertura del mapa utilizado.

Estimación preliminar de trabajo dedicado: 1–2 jornadas para demostrar matriz y trazado locales, y 2–4 adicionales para integración, validaciones y documentación operativa. No es una cotización ni una promesa de plazo: falta medir el entorno y la calidad de los datos. La contratación y el despliegue se decidirán después del piloto.

## Referencias

- [OR-Tools: optimización de recorridos](https://developers.google.com/optimization/routing).
- [OSRM: código y despliegue](https://github.com/Project-OSRM/osrm-backend).
- [OSRM: servicios de matriz y trazado](https://project-osrm.org/docs/v5.24.0/api/).
