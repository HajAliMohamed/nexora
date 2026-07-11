import numpy as np

def forecast_timeseries(history: list[float], horizon: int) -> dict:
    if len(history) < 4:
        return _fallback_forecast(history, horizon)

    arr = np.array(history, dtype=float)

    alpha = 0.3
    smoothed = [arr[0]]
    for i in range(1, len(arr)):
        smoothed.append(alpha * arr[i] + (1 - alpha) * smoothed[-1])

    recent = arr[-3:]
    trend = np.polyfit(range(len(recent)), recent, 1)[0] if len(recent) >= 2 else 0

    residuals = arr - np.array(smoothed[:len(arr)])
    std = np.std(residuals) if len(residuals) > 1 else arr.std() * 0.1

    last = smoothed[-1]
    forecast_values = []
    for i in range(1, horizon + 1):
        val = last + trend * i
        noise = np.random.normal(0, std * 0.3)
        forecast_values.append(round(float(val + noise), 2))

    ci_lower = [round(float(last + trend * i - 1.96 * std * np.sqrt(i)), 2) for i in range(1, horizon + 1)]
    ci_upper = [round(float(last + trend * i + 1.96 * std * np.sqrt(i)), 2) for i in range(1, horizon + 1)]

    return {
        "forecast": forecast_values,
        "confidence_lower": ci_lower,
        "confidence_upper": ci_upper,
        "trend_direction": "up" if trend > 0 else "down" if trend < 0 else "stable",
        "model": "exponential_smoothing",
    }

def _fallback_forecast(history: list[float], horizon: int) -> dict:
    base = history[-1] if history else 100
    return {
        "forecast": [round(base * (1 + 0.01 * (i % 3 - 1)), 2) for i in range(horizon)],
        "confidence_lower": [round(base * 0.8, 2)] * horizon,
        "confidence_upper": [round(base * 1.2, 2)] * horizon,
        "trend_direction": "stable",
        "model": "fallback",
    }
