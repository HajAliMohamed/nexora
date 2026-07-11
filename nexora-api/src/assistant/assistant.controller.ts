import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AssistantService } from './assistant.service';
import { AskAssistantDto } from './dto/assistant.dto';

@Controller()
@UseGuards(AuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('projects/:id/assistant')
  async ask(@Param('id') id: string, @Body() dto: AskAssistantDto) {
    return this.assistantService.askQuestion(id, dto.question);
  }

  @Post('projects/:id/copilot')
  async askCopilot(@Param('id') id: string, @Body() dto: AskAssistantDto) {
    return this.assistantService.askWithContext(id, dto.question);
  }
}
