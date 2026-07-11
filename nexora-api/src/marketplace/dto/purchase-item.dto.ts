import { IsOptional, IsString } from 'class-validator';

export class PurchaseItemDto {
  @IsOptional()
  @IsString()
  agencyId?: string;
}
