import numpy as np

def analyze_trend(history: list[float]) -> dict:
    if len(history) < 7:
        return _simple_trend(history)

    arr = np.array(history, dtype=float)
    x = np.arange(len(arr))

    slope, intercept = np.polyfit(x, arr, 1)
    fitted = slope * x + intercept

    seasonal_period = min(7, len(arr) // 2)
    seasonal = np.zeros(len(arr))
    if len(arr) >= seasonal_period * 2:
        for i in range(seasonal_period):
            indices = list(range(i, len(arr), seasonal_period))
            if len(indices) > 1:
                seasonal[i] = np.mean(arr[indices] - fitted[indices])
            elif indices:
                seasonal[i] = arr[indices[0]] - fitted[indices[0]]

    detrended = arr - fitted - seasonal[:len(arr)]

    last_7 = arr[-7:] if len(arr) >= 7 else arr
    short_term_slope = np.polyfit(range(len(last_7)), last_7, 1)[0] if len(last_7) >= 2 else 0

    momentum = "accelerating" if abs(short_term_slope) > abs(slope) * 1.5 and short_term_slope * slope > 0 else "stable"
    if abs(short_term_slope) < abs(slope) * 0.5 and slope != 0:
        momentum = "decelerating"

    return {
        "slope": round(float(slope), 4),
        "intercept": round(float(intercept), 2),
        "direction": "up" if slope > 0.01 else "down" if slope < -0.01 else "stable",
        "strength": round(float(np.std(detrended) / np.mean(arr) * 100), 2) if np.mean(arr) > 0 else 0,
        "momentum": momentum,
        "model": "linear_trend_decomposition",
    }

def _simple_trend(history: list[float]) -> dict:
    if len(history) < 2:
        return {"slope": 0, "intercept": history[-1] if history else 100,
                "direction": "stable", "strength": 0, "momentum": "stable",
                "model": "simple"}

    arr = np.array(history, dtype=float)
    slope, intercept = np.polyfit(range(len(arr)), arr, 1)
    return {
        "slope": round(float(slope), 4),
        "intercept": round(float(intercept), 2),
        "direction": "up" if slope > 0.01 else "down" if slope < -0.01 else "stable",
        "strength": round(float(np.std(arr) / np.mean(arr) * 100), 2) if np.mean(arr) > 0 else 0,
        "momentum": "stable",
        "model": "simple",
    }
