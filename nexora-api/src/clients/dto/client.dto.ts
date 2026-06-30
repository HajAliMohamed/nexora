import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class InviteClientDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;
}
