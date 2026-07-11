import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PredictiveForecast } from './predictive-forecast.entity';

@Injectable()
export class PredictiveService {
  private readonly logger = new Logger(PredictiveService.name);

  constructor(
    @InjectRepository(PredictiveForecast)
    private readonly forecastRepo: Repository<PredictiveForecast>,
    private readonly configService: ConfigService,
  ) {}

  async generateForecast(
    projectId: string,
    metricType: string,
    history: { date: string; value: number }[],
    horizonDays = 30,
  ): Promise<PredictiveForecast> {
    const mlUrl = this.configService.get('ML_SERVICE_URL') || 'http://localhost:5000';

    const values = history.map(h => h.value);
    if (values.length === 0) {
      throw new Error('Aucune donnée historique fournie pour la prédiction');
    }

    try {
      const response = await fetch(`${mlUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: values,
          metric_type: metricType,
          horizon: horizonDays,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const mlResult = await response.json() as any;

      const forecastPoints = mlResult.forecast.forecast.map((val: number, i: number) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        return {
          date: date.toISOString().split('T')[0],
          value: val,
          confidenceLower: mlResult.forecast.confidence_lower[i] ?? val * 0.85,
          confidenceUpper: mlResult.forecast.confidence_upper[i] ?? val * 1.15,
        };
      });

      const forecast = this.forecastRepo.create({
        projectId,
        metricType,
        history: history as any,
        forecast: forecastPoints as any,
        anomalies: (mlResult.risk?.anomalies ?? []) as any,
        trend: mlResult.trend ?? {},
        risk: mlResult.risk ?? {},
        horizonDays,
      });

      return this.forecastRepo.save(forecast);
    } catch (err) {
      this.logger.error(`ML service call failed: ${(err as Error).message}`);
      return this.generateLocalFallback(projectId, metricType, history, horizonDays);
    }
  }

  async getLatestForecast(projectId: string, metricType: string): Promise<PredictiveForecast | null> {
    return this.forecastRepo.findOne({
      where: { projectId, metricType },
      order: { createdAt: 'DESC' },
    });
  }

  private async generateLocalFallback(
    projectId: string,
    metricType: string,
    history: { date: string; value: number }[],
    horizonDays: number,
  ): Promise<PredictiveForecast> {
    const values = history.map(h => h.value);
    const lastValue = values[values.length - 1] || 100;

    const forecastPoints = [];
    for (let i = 1; i <= horizonDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const noise = (Math.random() - 0.5) * lastValue * 0.1;
      const value = Math.round(lastValue * (1 + 0.005 * i) + noise);
      forecastPoints.push({
        date: date.toISOString().split('T')[0],
        value,
        confidenceLower: Math.round(value * 0.85),
        confidenceUpper: Math.round(value * 1.15),
      });
    }

    const forecast = this.forecastRepo.create({
      projectId,
      metricType,
      history: history as any,
      forecast: forecastPoints as any,
      anomalies: [],
      trend: { direction: 'stable', model: 'fallback' },
      risk: { riskScore: 0, riskFactors: [], model: 'fallback' },
      horizonDays,
    });

    return this.forecastRepo.save(forecast);
  }
}
