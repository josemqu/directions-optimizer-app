import json
import sys

from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


def _solve_vrptw(time_matrix, time_windows, start_index, end_index):
    manager = pywrapcp.RoutingIndexManager(
        len(time_matrix), 1, [start_index], [end_index]
    )
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(time_matrix[from_node][to_node])

    transit_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    routing.AddDimension(
        transit_callback_index,
        3600,
        86400,
        False,
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    start, end = int(time_windows[start_index][0]), int(time_windows[start_index][1])
    time_dimension.CumulVar(routing.Start(0)).SetRange(start, end)

    start, end = int(time_windows[end_index][0]), int(time_windows[end_index][1])
    time_dimension.CumulVar(routing.End(0)).SetRange(start, end)

    for location_idx, window in enumerate(time_windows):
        if location_idx == start_index or location_idx == end_index:
            continue
        index = manager.NodeToIndex(location_idx)
        cumul = time_dimension.CumulVar(index)
        if cumul is None:
            continue
        start, end = int(window[0]), int(window[1])
        cumul.SetRange(start, end)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(5)

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        return None

    index = routing.Start(0)
    ordered_nodes = []
    arrivals = {}

    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        ordered_nodes.append(node)
        arrivals[str(node)] = int(solution.Value(time_dimension.CumulVar(index)))
        index = solution.Value(routing.NextVar(index))

    end_node = manager.IndexToNode(index)
    ordered_nodes.append(end_node)
    arrivals[str(end_node)] = int(solution.Value(time_dimension.CumulVar(index)))

    return {
        "ordered_nodes": ordered_nodes,
        "arrivals": arrivals,
    }


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)

    time_matrix = payload["time_matrix"]
    time_windows = payload["time_windows"]
    start_index = int(payload.get("start_index", 0))
    end_index = int(payload["end_index"])

    result = _solve_vrptw(time_matrix, time_windows, start_index, end_index)
    if result is None:
        print(json.dumps({"error": "no_solution"}))
        sys.exit(0)

    print(json.dumps(result))


if __name__ == "__main__":
    main()
