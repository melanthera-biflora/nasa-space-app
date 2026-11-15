import numpy as np

from tools.no2_version_check import compare


def test_compare_finds_the_version_and_the_mix():
    rng = np.random.default_rng(0)
    v3 = rng.uniform(0.5, 8, (20, 30))
    v4 = v3 * 0.85 + rng.normal(0, 0.2, v3.shape)
    v3[0, 0] = np.nan                                  # a cell missing in one version is left out

    same = compare(v4.copy(), v3, v4)
    assert same["cells"] == 599
    assert same["v004"]["exact_share"] == 1.0 and same["v003"]["exact_share"] < 0.1
    assert abs(same["mix_v003"]) < 1e-9

    mixed = compare(0.3 * v3 + 0.7 * v4, v3, v4)
    assert abs(mixed["mix_v003"] - 0.3) < 1e-9
    assert mixed["v004"]["exact_share"] < 0.5
