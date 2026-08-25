import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/** Formats all HTTP errors using the application's standard API envelope. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  /** Sends a safe, consistent error response without exposing internal details. */
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : undefined;
    const message = this.getMessage(exceptionResponse, status);

    response.status(status).json({
      success: false,
      message,
    });
  }

  /** Extracts a client-safe message from a Nest exception response. */
  private getMessage(response: string | object | undefined, status: number): string | string[] {
    if (typeof response === 'string') {
      return response;
    }

    if (response && 'message' in response) {
      const message = response.message;

      if (typeof message === 'string' || Array.isArray(message)) {
        return message;
      }
    }

    return status === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Internal Server Error'
      : HttpStatus[status] ?? 'Error';
  }
}
