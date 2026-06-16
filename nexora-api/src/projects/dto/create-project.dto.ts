import { IsString, IsNotEmpty } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  languageCode: string;
}
