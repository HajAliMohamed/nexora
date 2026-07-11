import { IsString, IsArray, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class GenerateForecastDto {
  @IsString()
  metricType: string;

  @IsArray()
  history: { date: string; value: number }[];

  @IsNumber()
  @IsOptional()
  @Min(7)
  @Max(180)
  horizonDays?: number;
}
