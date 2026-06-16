import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class AddKeywordDto {
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  languageCode: string;

  @IsString()
  @IsOptional()
  @IsIn(['desktop', 'mobile'])
  device?: string;
}
