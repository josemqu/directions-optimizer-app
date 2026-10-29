# Piloto local: OSRM + OR-Tools

El piloto reemplaza las llamadas de matriz y trazado de Google Routes mediante una selección explícita de proveedor. Mantiene OR-Tools y el contrato de la API de la aplicación. No utiliza tráfico en vivo. Google continúa como valor predeterminado para otros procesos y despliegues.

## Ejecutar

Requiere Docker activo, pnpm y Python 3.11 o posterior. Desde la raíz del proyecto:

```bash
bash scripts/osrm-local.sh prepare
bash scripts/osrm-local.sh start
bash scripts/osrm-local.sh app
```

La aplicación queda en `http://127.0.0.1:3101` y OSRM en `http://127.0.0.1:5001`. Ambos se publican solo en loopback. La preparación descarga el extracto provincial de OpenStreetMap, selecciona caminos de Mar del Plata con referencias completas y restricciones de giro, y ejecuta extract, partition y customize de OSRM. Usa una imagen versionada y genera `.local/osrm/data-manifest.json` con fecha de datos, hash y cobertura. Datos y entorno Python quedan ignorados por Git.

El script `app` establece `ROUTING_PROVIDER=osrm`, `OSRM_BASE_URL`, `PYTHON_BIN` y `NEXT_DIST_DIR=.next-pilot`, y deja vacía la clave de Google Routes. No cambia `.env.local`. La carpeta de compilación separada permite mantener otro servidor de desarrollo existente.

Para usar OSRM desde el servidor habitual de `http://localhost:3000`, configurar también en `.env.local`:

```dotenv
ROUTING_PROVIDER=osrm
OSRM_BASE_URL=http://127.0.0.1:5001
```

Sin esa configuración, `pnpm dev` usa Google por defecto aunque el piloto del puerto 3101 esté funcionando. El indicador de proveedor corresponde al último cálculo completado: después de cambiar la configuración hay que volver a optimizar. El motor Docker debe permanecer activo.

El proveedor no cambia la búsqueda de direcciones ni los enlaces de navegación. Los mapas y la búsqueda pueden seguir necesitando Internet; este piloto elimina las consultas a Google Routes para optimizar, no todas las dependencias de red de la app.

## Comprobar

Con la aplicación y el motor activos:

```bash
python3 scripts/check_osrm_pilot.py
node --experimental-strip-types --test tests/osrm.test.mjs
.local/pilot-venv/bin/python -m unittest discover -s tests -p 'test_*.py'
```

Las pruebas TypeScript usan el soporte de eliminación de tipos de Node, disponible en las versiones modernas de Node 22 y posteriores; se ejecutaron con Node 23.11.0. Las coordenadas de la prueba son sintéticas y se ajustan a calles reales del mapa local. No representan recorridos operativos aportados por el usuario ni consultan Google desde el script.

Se verifican matrices asimétricas, visitas completas, origen fijo, destino libre, geometría por calles, atención, condiciones antes/después, restricciones imposibles, máximo de puntos, cobertura y puntos coincidentes. Las pruebas del adaptador también verifican que los fallos no disparen consultas a Google. Para comprobar el fallo real, detener OSRM y pedir una optimización debe devolver `503`.

## Resultado observado el 28 de octubre de 2026

Medición local, solicitudes secuenciales, sin tráfico en vivo. Mediana de cinco consultas de matriz por tamaño; una optimización completa por tamaño, con presupuesto de búsqueda del solver de cinco segundos.

| Puntos | Matriz OSRM | Optimización completa | Puntos del trazado |
| --- | ---: | ---: | ---: |
| 3 | 4,93 ms | 5,24 s | 42 |
| 10 | 14,10 ms | 5,13 s | 119 |
| 25 | 28,81 ms | 5,16 s | 332 |

En una segunda ejecución, usando por primera vez el entorno Python aislado mientras corría un build, la primera solicitud tardó 25,06 s; las siguientes volvieron a 5,14–5,16 s. No se aisló la causa de ese arranque lento. Falta medir arranque en frío y concurrencia en un entorno representativo antes de definir tiempos garantizados.

OSRM consumió aproximadamente 50 MiB inicialmente y 71 MiB después de completar las pruebas, dentro del límite de 512 MiB y una CPU del contenedor. Los archivos procesados suman 55,45 MiB. Esto mide solo el motor, no Next.js ni Python, y no constituye una prueba de concurrencia ni una cotización de alojamiento.

El extracto regional pesa 1.534.613 bytes y seleccionó 18.548 caminos. Fuente provincial con timestamp `2026-10-29T00:32:57Z` (28 de octubre a las 21:32:57 en Argentina), SHA-256 `461a39062796654567d000d9f75ac7f835f861c6d0c00645e3a40be36fd209f4`. Imagen OSRM `v5.27.1`; OR-Tools probado con `9.15.6755`.

Pasaron nueve pruebas del adaptador y tres casos de comportamiento ejecutados contra los dos solvers. También pasó la prueba completa de la API con 3, 10 y 25 puntos y los casos de error. Con el motor detenido se verificó `503`, sin fallback. TypeScript y el build pasaron; el lint general sigue reportando errores previos en el código existente. Los archivos nuevos de TypeScript y sus pruebas pasan lint.

La prueba reveló que ejecutar Python de forma síncrona bloqueaba los temporizadores de Node y dejaba vencer una conexión HTTP reutilizada antes de pedir el trazado. El solver local ahora se ejecuta de forma asíncrona. La prueba completa reproduce esa secuencia y verifica el resultado.

## Cobertura y límites

- La aplicación admite latitud `[-38.2, -37.9]`, longitud `[-58.15, -57.45]` y hasta 25 puntos incluido el origen. Es un rectángulo de cobertura inicial, no una frontera administrativa.
- El recorte usa un margen mayor: longitud `[-58.3, -57.3]`, latitud `[-38.4, -37.65]`. Se conservan caminos completos y restricciones de giro relacionadas.
- Se exige una calle a menos de 200 metros. Un par sin conexión vial, un punto fuera de cobertura o una geometría inválida produce error explícito.
- Los horarios se comprueban sobre estimaciones; falta validar calidad con recorridos conocidos. No se hizo comparación contra Google ni medición con tráfico real.
- No se midió todavía la carga concurrente ni se eligió alojamiento dentro del techo de US$10 mensuales.

## Detener y actualizar

Para detener la aplicación, usar Ctrl+C en su terminal. Para detener solo el motor:

```bash
bash scripts/osrm-local.sh stop
```

No hay actualización automática del mapa. Para regenerarlo con datos nuevos, detener primero la aplicación y el motor, conservar el manifest anterior si se necesita comparar, mover `.local/osrm` a una carpeta de respaldo y ejecutar nuevamente `prepare` y `start`. La preparación reutiliza archivos existentes; no refresca silenciosamente un mapa descargado.

## Fuentes

- [OSRM: código y preparación de datos](https://github.com/Project-OSRM/osrm-backend).
- [OSRM: servicios de matriz y rutas](https://project-osrm.org/docs/v5.24.0/api/).
- [Extractos provinciales de OpenStreetMap France](https://download.openstreetmap.fr/extracts/south-america/argentina/).
- [Pyosmium: escritura con referencias completas](https://docs.osmcode.org/pyosmium/latest/user_manual/06-Writing-Data/).
