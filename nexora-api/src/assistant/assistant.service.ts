import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly configService: ConfigService) {}

  async askQuestion(projectId: string, question: string): Promise<{
    answer: string;
    context: Record<string, unknown>;
  }> {
    const groqApiKey = this.configService.get('GROQ_API_KEY');

    if (!groqApiKey) {
      return {
        answer: 'Service IA non configuré. Ajoutez une clé GROQ_API_KEY dans le fichier .env.',
        context: { source: 'error', projectId },
      };
    }

    try {
      return await this.callGroq(projectId, question, groqApiKey);
    } catch (error) {
      this.logger.error(`Groq API error: ${error.message}`);
      return {
        answer: 'Service IA temporairement indisponible. Réessayez plus tard.',
        context: { source: 'error', projectId },
      };
    }
  }

  private async callGroq(projectId: string, question: string, apiKey: string): Promise<{
    answer: string;
    context: Record<string, unknown>;
  }> {
    const systemPrompt = `Tu es un assistant SEO expert pour la plateforme Nexora. 
Tu aides les agences marketing à analyser les performances SEO de leurs clients.
Réponds en français, sois concis et donne des recommandations actionnables.
Projet ID: ${projectId}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json() as any;
    const answer = data.choices?.[0]?.message?.content || 'Réponse non disponible';

    return {
      answer,
      context: {
        source: 'groq',
        model: 'llama-3.3-70b-versatile',
        projectId,
      },
    };
  }


}
