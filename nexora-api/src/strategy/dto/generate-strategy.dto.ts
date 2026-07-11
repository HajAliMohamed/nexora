import { IsString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';

export class GenerateStrategyDto {
  @IsString()
  @IsOptional()
  @IsIn(['traffic', 'leads', 'authority'])
  businessGoal?: string;

  @IsInt()
  @IsOptional()
  @Min(30)
  @Max(180)
  horizonDays?: number;
}
