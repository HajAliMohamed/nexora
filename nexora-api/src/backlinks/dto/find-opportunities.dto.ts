import { IsString } from 'class-validator';

export class FindOpportunitiesDto {
  @IsString()
  domain: string;
}
