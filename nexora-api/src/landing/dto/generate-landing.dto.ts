import { IsString, IsArray } from 'class-validator';

export class GenerateLandingDto {
  @IsString()
  topic: string;

  @IsArray()
  keywords: string[];
}
