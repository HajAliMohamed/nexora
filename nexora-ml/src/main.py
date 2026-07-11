from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from models.forecaster import forecast_timeseries
from models.trend import analyze_trend
from models.risk import detect_risks

app = FastAPI(title="Nexora ML Service", version="1.0.0")


class ForecastRequest(BaseModel):
    history: list[float]
    horizon: int = 30


class ForecastResponse(BaseModel):
    forecast: list[float]
    confidence_lower: list[float]
    confidence_upper: list[float]
    trend_direction: str
    model: str


class TrendRequest(BaseModel):
    history: list[float]


class RiskRequest(BaseModel):
    history: list[float]


class AnalyzeRequest(BaseModel):
    history: list[float]
    metric_type: str = "traffic"
    horizon: int = 30


@app.get("/health")
async def health():
    return {"status": "ok", "service": "nexora-ml", "version": "1.0.0"}


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(req: ForecastRequest):
    try:
        result = forecast_timeseries(req.history, req.horizon)
        return ForecastResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/trend")
async def trend(req: TrendRequest):
    try:
        result = analyze_trend(req.history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/risk")
async def risk(req: RiskRequest):
    try:
        result = detect_risks(req.history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        forecast_result = forecast_timeseries(req.history, req.horizon)
        trend_result = analyze_trend(req.history)
        risk_result = detect_risks(req.history)

        return {
            "metric_type": req.metric_type,
            "forecast": forecast_result,
            "trend": trend_result,
            "risk": risk_result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
