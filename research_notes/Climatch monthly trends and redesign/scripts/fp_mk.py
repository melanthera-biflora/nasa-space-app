# Type-I error (no trend) of pymannkendall variants on monthly AR(1) anomalies; NaN counts for Hamed-Rao.
import warnings, numpy as np, pymannkendall as mk
warnings.filterwarnings("ignore")
rng = np.random.default_rng(1)
def ar1(n, phi):
    e = rng.normal(0, 1, n); x = np.empty(n); x[0] = e[0] / np.sqrt(1 - phi**2)
    for i in range(1, n): x[i] = phi * x[i-1] + e[i]
    return x
tests = {
    "original": lambda a, x: mk.original_test(a),
    "hamed_rao(all lags)": lambda a, x: mk.hamed_rao_modification_test(a),
    "hamed_rao(lag=3)": lambda a, x: mk.hamed_rao_modification_test(a, lag=3),
    "yue_wang(all lags)": lambda a, x: mk.yue_wang_modification_test(a),
    "yue_wang(lag=1)": lambda a, x: mk.yue_wang_modification_test(a, lag=1),
    "pre_whitening": lambda a, x: mk.pre_whitening_modification_test(a),
    "tfpw": lambda a, x: mk.trend_free_pre_whitening_modification_test(a),
    "seasonal_test(raw)": lambda a, x: mk.seasonal_test(x, period=12),
    "correlated_seasonal(raw)": lambda a, x: mk.correlated_seasonal_test(x, period=12),
}
for phi in (0.2, 0.5):
    N = 200; rej = {k: 0 for k in tests}; nan = {k: 0 for k in tests}
    for _ in range(N):
        a = ar1(300, phi); x = a + 10 * np.sin(2 * np.pi * np.arange(300) / 12)
        for k, f in tests.items():
            p = f(a, x).p
            if np.isnan(p): nan[k] += 1
            elif p < 0.05: rej[k] += 1
    print(f"phi={phi} n=300 monthly, alpha=0.05, no trend; rejection rate (NaN count):")
    for k in tests: print(f"   {k:26s} {rej[k]/N:.3f} ({nan[k]})")
# Annual means of the same process: original MK on 25 annual values
for phi in (0.2, 0.5):
    N = 400; r = 0
    for _ in range(N):
        a = ar1(300, phi).reshape(25, 12).mean(1); r += mk.original_test(a).p < 0.05
    print(f"annual means (25 yrs) from monthly phi={phi}: original MK rejection {r/N:.3f}")
