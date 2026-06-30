import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  @IsIn(['weekly', 'monthly', 'quarterly'])
  @IsOptional()
  periodType?: 'weekly' | 'monthly' | 'quarterly';
}
