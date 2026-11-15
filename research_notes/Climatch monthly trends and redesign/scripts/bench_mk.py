# Benchmark pymannkendall on monthly (300) and weekly (1300) synthetic series with AR(1) noise.
import time, numpy as np, pymannkendall as mk
rng = np.random.default_rng(0)
def ar1(n, phi, sd):
    e = rng.normal(0, sd, n); x = np.empty(n); x[0] = e[0]
    for i in range(1, n): x[i] = phi * x[i-1] + e[i]
    return x
def series(n, per, phi, trend_per_step):
    t = np.arange(n)
    return 10*np.sin(2*np.pi*t/per) + trend_per_step*t + ar1(n, phi, 1.0)
for name, n, per in [("monthly", 300, 12), ("weekly", 1300, 52)]:
    x = series(n, per, 0.5, 0.0)   # no trend, autocorrelated noise
    for fn in ["original_test", "hamed_rao_modification_test", "yue_wang_modification_test",
               "trend_free_pre_whitening_modification_test"]:
        anom = x - np.array([x[i::per].mean() for i in range(per)])[np.arange(n) % per]
        t0 = time.perf_counter(); r = getattr(mk, fn)(anom); dt = time.perf_counter() - t0
        print(f"{name:7s} {fn:45s} p={r.p:.3f} slope={r.slope:+.4f} {dt*1000:7.1f} ms")
    for fn in ["seasonal_test", "correlated_seasonal_test"]:
        t0 = time.perf_counter(); r = getattr(mk, fn)(x, period=per); dt = time.perf_counter() - t0
        print(f"{name:7s} {fn:45s} p={r.p:.3f} slope={r.slope:+.4f} {dt*1000:7.1f} ms")
    t0 = time.perf_counter(); s = mk.seasonal_sens_slope(x, period=per); dt = time.perf_counter() - t0
    print(f"{name:7s} seasonal_sens_slope {dt*1000:.1f} ms")
# False-positive rate of original vs Hamed-Rao on monthly anomalies, phi=0.5, no trend
fp = {"original_test": 0, "hamed_rao_modification_test": 0, "yue_wang_modification_test": 0,
      "trend_free_pre_whitening_modification_test": 0}
N = 300
for k in range(N):
    a = ar1(300, 0.5, 1.0)
    for fn in fp: fp[fn] += getattr(mk, fn)(a).p < 0.05
print("False-positive rate at alpha=0.05, AR(1) phi=0.5, n=300, no trend:", {k: v/N for k, v in fp.items()})
