# Weatherhead n* table + does weekly vs monthly vs annual aggregation change trend precision?
import numpy as np
def n_star(trend_per_yr, sigma_month, phi, k=3.3):
    return ((k * sigma_month / abs(trend_per_yr)) * np.sqrt((1 + phi) / (1 - phi))) ** (2 / 3)
print("Years needed (90% chance at p<0.05), trend 0.3/decade:")
for s in (0.5, 1.0, 1.5, 2.0):
    print("  sigmaN", s, [round(n_star(0.03, s, p), 1) for p in (0.0, 0.2, 0.5)], "(phi 0, 0.2, 0.5)")
print("Same with k=2 (50% chance):", [round(n_star(0.03, s, 0.2, 2.0), 1) for s in (0.5, 1.0, 1.5, 2.0)])
rng = np.random.default_rng(2)
yrs, nd, phi_d, sd = 25, 25 * 364, 0.7, 3.0
slopes = {"daily": [], "weekly": [], "monthly(28d)": [], "annual": []}
for _ in range(400):
    e = rng.normal(0, sd * np.sqrt(1 - phi_d**2), nd); x = np.empty(nd); x[0] = rng.normal(0, sd)
    for i in range(1, nd): x[i] = phi_d * x[i - 1] + e[i]
    for name, w in (("daily", 1), ("weekly", 7), ("monthly(28d)", 28), ("annual", 364)):
        y = x.reshape(-1, w).mean(1); t = (np.arange(len(y)) + 0.5) * w / 364
        slopes[name].append(np.polyfit(t, y, 1)[0] * 10)
for k, v in slopes.items(): print(f"SD of fitted slope (per decade), {k:12s}: {np.std(v):.3f}")
w = x.reshape(-1, 7).mean(1); m = x.reshape(-1, 28).mean(1)
ac = lambda z: np.corrcoef(z[:-1], z[1:])[0, 1]
print(f"lag-1 autocorr: weekly {ac(w):.2f}, monthly {ac(m):.2f}; noise SD weekly {w.std():.2f}, monthly {m.std():.2f}")
