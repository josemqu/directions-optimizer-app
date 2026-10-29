"""Casos de comportamiento compartidos por los dos puntos de entrada del solver."""

import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


def solvers():
    for relative in ("scripts/optimize_ortools.py", "api/solve_ortools.py"):
        spec = importlib.util.spec_from_file_location(relative, ROOT / relative)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        yield relative, module._solve_vrptw


class SolverBehaviorTests(unittest.TestCase):
    def test_later_deadline_can_be_visited_first(self):
        # A vence a los 50s, B a los 100s. A→B no cumple; B→A sí.
        matrix = [[0, 40, 1, 0], [40, 0, 100, 0], [1, 1, 0, 0], [0, 0, 0, 0]]
        windows = [[0, 0], [0, 50], [0, 100], [0, 86400]]
        for name, solve in solvers():
            with self.subTest(solver=name):
                result = solve(matrix, windows, [0] * 4, 0, 3)
                self.assertIsNotNone(result)
                self.assertEqual(result["ordered_nodes"], [0, 2, 1, 3])
                self.assertLessEqual(result["arrivals"]["1"], 50)
                self.assertLessEqual(result["arrivals"]["2"], 100)

    def test_impossible_deadline_remains_infeasible(self):
        matrix = [[0, 100, 100, 0], [100, 0, 100, 0], [100, 100, 0, 0], [0] * 4]
        windows = [[0, 0], [0, 50], [0, 50], [0, 86400]]
        for name, solve in solvers():
            with self.subTest(solver=name):
                self.assertIsNone(solve(matrix, windows, [0] * 4, 0, 3))

    def test_after_window_and_service_time(self):
        matrix = [[0, 10, 1000, 0], [10, 0, 10, 0], [1000, 10, 0, 0], [0] * 4]
        windows = [[0, 0], [100, 200], [0, 500], [0, 86400]]
        for name, solve in solvers():
            with self.subTest(solver=name):
                result = solve(matrix, windows, [0, 60, 60, 0], 0, 3)
                self.assertIsNotNone(result)
                arrivals = result["arrivals"]
                self.assertGreaterEqual(arrivals["1"], 100)
                self.assertGreaterEqual(arrivals["2"], arrivals["1"] + 70)


if __name__ == "__main__":
    unittest.main()
