---
trigger: manual
---

# Guía de Implementación: Optimización de Rutas con OR-Tools y Google Maps

Este documento detalla el flujo de trabajo para optimizar rutas de hasta 10 destinos, incluyendo coordenadas geográficas y restricciones de horarios (ventanas de tiempo).

## 1. Requisitos Previos e Infraestructura

### 1.1. Credenciales de Google Cloud

Para obtener datos reales de tráfico y distancia, necesitas una **API Key** activa:

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilita la **Routes API**.
3. Genera una clave de API en la sección de "Credenciales".
4. **Nota:** Asegúrate de restringir la clave por IP o por aplicación para evitar usos no autorizados.

### 1.2. Entorno de Software

Instala la biblioteca de optimización de Google:

```bash
pip install ortools

```

---

## 2. Fase 1: Obtención de Datos (Matrix de Tiempos)

El motor de OR-Tools necesita saber cuánto tiempo toma viajar de cada punto a todos los demás. Utilizaremos el endpoint más moderno de Google.

- **Endpoint:** `POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`
- **Headers:**
- `Content-Type: application/json`
- `X-Goog-Api-Key: TU_API_KEY`
- `X-Goog-FieldMask: originIndex,destinationIndex,duration,distanceMeters`

### Estructura del JSON (Input)

```json
{
  "origins": [
    {
      "waypoint": {
        "location": { "latLng": { "latitude": -34.6, "longitude": -58.38 } }
      }
    },
    {
      "waypoint": {
        "location": { "latLng": { "latitude": -34.61, "longitude": -58.39 } }
      }
    }
  ],
  "destinations": [
    {
      "waypoint": {
        "location": { "latLng": { "latitude": -34.6, "longitude": -58.38 } }
      }
    },
    {
      "waypoint": {
        "location": { "latLng": { "latitude": -34.61, "longitude": -58.39 } }
      }
    }
  ],
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE"
}
```

---

## 3. Fase 2: Modelado en OR-Tools (VRPTW)

Para manejar horarios del tipo "Llegar antes de las 9:00 AM", configuramos un problema de **Vehicle Routing Problem with Time Windows (VRPTW)**.

### Conceptos Clave

1. **Horizonte de Tiempo:** Define un "segundo 0" (ej. 08:00 AM).
2. **Ventana de Tiempo:** Si un lugar abre a las 08:30 y cierra a las 09:00, su ventana en segundos sería `(1800, 3600)`.
3. **Dimensión de Tiempo:** Es el "acumulador" que suma el tiempo de viaje más el tiempo de estancia en cada parada.

---

## 4. Estructura del Script de Optimización

A continuación, la lógica principal para procesar los 10 destinos con sus restricciones:

```python
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def create_data_model():
    data = {}
    # Matriz obtenida de la API de Google (en segundos)
    data['time_matrix'] = [
        [0, 540, 980],  # Ejemplo: Origen a destinos
        [540, 0, 320],
        [980, 320, 0]
    ]
    # Ventanas de tiempo (segundos desde el inicio, ej. 8:00 AM)
    # (inicio, fin)
    data['time_windows'] = [
        (0, 36000),  # Origen (Depósito)
        (0, 3600),   # Destino 1: Antes de las 9:00 AM
        (1800, 7200) # Destino 2: Entre 8:30 y 10:00 AM
    ]
    data['num_vehicles'] = 1
    data['depot'] = 0
    return data

def main():
    data = create_data_model()
    manager = pywrapcp.RoutingIndexManager(len(data['time_matrix']),
                                           data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['time_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Añadir Dimensión de Tiempo
    routing.AddDimension(
        transit_callback_index,
        3600,  # Tiempo de espera máximo (slack)
        36000, # Tiempo máximo total de ruta
        False,
        'Time'
    )
    time_dimension = routing.GetDimensionOrDie('Time')

    # Añadir restricciones de Ventana de Tiempo para cada locación
    for location_idx, time_window in enumerate(data['time_windows']):
        index = manager.NodeToIndex(location_idx)
        time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

    # Resolver
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

    solution = routing.SolveWithParameters(search_parameters)
    # ... extraer y mostrar resultados

```

---

## 5. Resumen del Workflow Diario

| Paso  | Acción                                     | Herramienta           |
| ----- | ------------------------------------------ | --------------------- |
| **1** | Recopilar Coordenadas y Horarios           | Base de datos / App   |
| **2** | Consultar Matriz de Tiempos                | Google Routes API     |
| **3** | Alimentar OR-Tools con la Matriz           | Script Python         |
| **4** | Obtener el orden de paradas óptimo         | OR-Tools Solver       |
| **5** | Solicitar trazado (Polilínea) para el mapa | Google Directions API |
| **6** | Mostrar ruta al conductor                  | Google Maps SDK       |

---

> **Nota Pro:** Para los 10 destinos, el costo de la matriz es bajo, pero recuerda que si el origen y el destino de la jornada son diferentes, debes ajustar el parámetro `depot` y la creación del `RoutingIndexManager` para reflejar una ruta abierta.
