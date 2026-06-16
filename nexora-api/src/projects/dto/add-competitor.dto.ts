import { IsString, IsNotEmpty } from 'class-validator';

export class AddCompetitorDto {
  @IsString()
  @IsNotEmpty()
  domain: string;
}
