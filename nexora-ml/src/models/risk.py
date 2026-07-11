import numpy as np

def detect_risks(history: list[float]) -> dict:
    if len(history) < 4:
        return {"risk_score": 0, "anomalies": [], "risk_factors": []}

    arr = np.array(history, dtype=float)
    mean = np.mean(arr)
    std = np.std(arr)

    if std == 0:
        return {"risk_score": 0, "anomalies": [], "risk_factors": []}

    z_scores = (arr - mean) / std
    anomalies = []
    for i, (val, z) in enumerate(zip(arr, z_scores)):
        if abs(z) > 2:
            anomalies.append({
                "index": i,
                "value": float(val),
                "z_score": round(float(z), 2),
                "type": "spike" if z > 0 else "drop",
            })

    recent_values = arr[-3:]
    recent_mean = np.mean(recent_values)
    drop_risk = max(0, (mean - recent_mean) / mean * 100) if mean > 0 else 0

    volatility = np.std(arr[-7:]) / np.mean(arr[-7:]) if len(arr) >= 7 and np.mean(arr[-7:]) > 0 else 0

    risk_factors = []
    if drop_risk > 10:
        risk_factors.append({
            "factor": "recent_decline",
            "severity": "high" if drop_risk > 20 else "medium",
            "detail": f"Baisse de {drop_risk:.1f}% sur les dernières valeurs",
        })
    if volatility > 0.15:
        risk_factors.append({
            "factor": "high_volatility",
            "severity": "medium",
            "detail": f"Volatilité élevée ({volatility:.1%})",
        })
    if len(anomalies) >= 2:
        risk_factors.append({
            "factor": "multiple_anomalies",
            "severity": "medium",
            "detail": f"{len(anomalies)} anomalies détectées dans l'historique",
        })

    risk_score = min(100, drop_risk * 2 + volatility * 100 + len(anomalies) * 5)

    return {
        "risk_score": round(float(risk_score), 1),
        "anomalies": anomalies,
        "risk_factors": risk_factors,
        "volatility": round(float(volatility), 4),
        "model": "z_score_detection",
    }
