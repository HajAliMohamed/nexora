import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateAgencyDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateAgencyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @IsString()
  @IsOptional()
  customDomain?: string;
}

export class InviteTeamMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  role?: 'admin' | 'member';
}
