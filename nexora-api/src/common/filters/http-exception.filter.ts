import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || exception.message;
      if (Array.isArray(message)) message = message.join('; ');
    }

    if (statusCode >= 500) {
      this.logger.error(
        `[${statusCode}] ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({ error: message, message, statusCode });
  }
}