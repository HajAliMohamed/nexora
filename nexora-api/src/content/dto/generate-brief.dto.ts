import { IsString, IsArray } from 'class-validator';

export class GenerateBriefDto {
  @IsString()
  topic: string;

  @IsArray()
  keywords: string[];
}

export class GenerateArticleDto {
  @IsString()
  briefId: string;
}
