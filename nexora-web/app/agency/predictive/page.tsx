'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project, PredictiveForecast } from '@/lib/types/shared';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, ComposedChart, AreaChart,
} from 'recharts';

const METRIC_TYPES = [
  { value: 'traffic', label: 'Trafic' },
  { value: 'keywords', label: 'Mots-clés' },
  { value: 'pages', label: 'Pages' },
];

export default function AgencyPredictivePage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [metricType, setMetricType] = useState('traffic');
  const [horizonDays, setHorizonDays] = useState(30);

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });

  const agency = agencies?.[0];

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
    enabled: !!agency,
  });

  const { data: existingForecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['predictive', selectedProject, metricType],
    queryFn: () => apiFetch<PredictiveForecast | null>(
      `/projects/${selectedProject}/predictive?metricType=${metricType}`
    ),
    enabled: !!selectedProject,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const mockHistory = generateMockHistory(metricType);
      return apiFetch<PredictiveForecast>(
        `/projects/${selectedProject}/predictive/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            metricType,
            history: mockHistory,
            horizonDays,
          }),
        }
      );
    },
  });

  const chartData = useMemo(() => {
    const forecast = existingForecast || generateMutation.data;
    if (!forecast) return [];

    const historyPoints = forecast.history.map(h => ({
      date: h.date,
      actual: h.value,
      forecast: null,
      confidenceLower: null,
      confidenceUpper: null,
    }));

    const forecastPoints = forecast.forecast.map(f => ({
      date: f.date,
      actual: null,
      forecast: f.value,
      confidenceLower: f.confidenceLower,
      confidenceUpper: f.confidenceUpper,
    }));

    return [...historyPoints.slice(-30), ...forecastPoints];
  }, [existingForecast, generateMutation.data]);

  const forecast = existingForecast || generateMutation.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Predictive SEO Engine</h1>
          <p className="text-sm text-muted-foreground">Prédictions trafic, mots-clés et pages</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={metricType}
            onChange={e => setMetricType(e.target.value)}
            className="w-36"
          >
            {METRIC_TYPES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
          <Select
            value={String(horizonDays)}
            onChange={e => setHorizonDays(Number(e.target.value))}
            className="w-28"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="60">60 jours</option>
            <option value="90">90 jours</option>
          </Select>
          <Select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="w-48"
          >
            <option value="">Projet...</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!selectedProject || generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Génération...' : 'Prédire'}
          </Button>
        </div>
      </div>

      {!selectedProject && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Sélectionnez un projet pour voir les prédictions SEO</p>
          </CardContent>
        </Card>
      )}

      {selectedProject && forecastLoading && (
        <div className="space-y-4">
          <Skeleton className="h-80" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      )}

      {selectedProject && !forecastLoading && (
        <>
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Prévision {METRIC_TYPES.find(m => m.value === metricType)?.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(5)}
                        className="text-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="confidenceUpper"
                        fill="#8884d8"
                        stroke="none"
                        fillOpacity={0.1}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidenceLower"
                        fill="#8884d8"
                        stroke="none"
                        fillOpacity={0.1}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        dot={false}
                        name="Réel"
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#06B6D4"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Prédiction"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {forecast && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${
                      forecast.trend?.direction === 'up' ? 'text-success' :
                      forecast.trend?.direction === 'down' ? 'text-destructive' : 'text-muted-foreground'
                    }`} />
                    <p className="text-sm text-muted-foreground">Tendance</p>
                  </div>
                  <p className="text-lg font-bold mt-1 capitalize">
                    {forecast.trend?.direction === 'up' ? 'Haussière' :
                     forecast.trend?.direction === 'down' ? 'Baissière' : 'Stable'}
                  </p>
                  {forecast.trend?.strength > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Force: {forecast.trend.strength.toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      (forecast.risk?.riskScore ?? 0) > 50 ? 'text-destructive' :
                      (forecast.risk?.riskScore ?? 0) > 20 ? 'text-warning' : 'text-muted-foreground'
                    }`} />
                    <p className="text-sm text-muted-foreground">Risque</p>
                  </div>
                  <p className="text-lg font-bold mt-1">{forecast.risk?.riskScore ?? 0}/100</p>
                  {forecast.risk?.riskFactors?.map((rf: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground mt-1">{rf.detail}</p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Momentum</p>
                  </div>
                  <p className="text-lg font-bold mt-1 capitalize">{forecast.trend?.momentum || 'stable'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Horizon: {forecast.horizonDays} jours
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {!forecast && !generateMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Aucune prédiction</p>
                <p className="text-xs text-muted-foreground">Cliquez sur &quot;Prédire&quot; pour générer une prévision IA</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function generateMockHistory(metricType: string): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const baseValue = metricType === 'traffic' ? 1500 : metricType === 'keywords' ? 45 : 30;

  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const trend = Math.sin(i * 0.1) * baseValue * 0.1;
    const noise = (Math.random() - 0.5) * baseValue * 0.05;
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(baseValue + trend + noise),
    });
  }

  return data;
}
