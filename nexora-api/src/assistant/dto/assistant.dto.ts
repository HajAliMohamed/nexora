import { IsString, IsNotEmpty } from 'class-validator';

export class AskAssistantDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}
