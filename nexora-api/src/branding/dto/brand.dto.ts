import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  colors?: Record<string, string>;

  @IsString()
  @IsOptional()
  domain?: string;
}
