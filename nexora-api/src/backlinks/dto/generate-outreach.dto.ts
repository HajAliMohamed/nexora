import { IsString } from 'class-validator';

export class GenerateOutreachDto {
  @IsString()
  opportunityId: string;
}
