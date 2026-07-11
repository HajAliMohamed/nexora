import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsString()
  triggerType: string;

  @IsObject()
  triggerConfig: Record<string, unknown>;

  @IsString()
  actionType: string;

  @IsObject()
  actionConfig: Record<string, unknown>;
}

export class UpdateRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsObject()
  @IsOptional()
  triggerConfig?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  actionConfig?: Record<string, unknown>;
}
