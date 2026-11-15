"""Colour classes shared by the US map and the month heatmap (analysis/timeline.py)."""
import numpy as np

from analysis.timeline import class_edges, monthly_classes


def test_class_edges_make_equal_count_classes():
    values = np.arange(1, 71)                                      # 70 values -> 7 classes of about 10
    edges = class_edges(np.r_[values, np.nan])
    assert len(edges) == 6 and edges == sorted(edges)
    assert all(9 <= n <= 11 for n in np.bincount(np.digitize(values, edges)))
    assert class_edges([0, 0, 0, 0, 5]) == [2.1]                   # zero edges collapse, 2 significant figures
    assert class_edges([np.nan]) == []


def test_one_extreme_month_does_not_take_over_the_heatmap_classes():
    values = np.r_[np.linspace(3, 10, 299), 156.5]                 # a smoke August among ordinary months
    classes = monthly_classes(values, values - values.mean())
    assert max(classes["value"]) < 11                              # edges follow the ordinary months
    assert len(classes["anomaly"]) == 4 and min(classes["anomaly"]) > 0
