import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Error interno del servidor';
        let type = 'Error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (
                typeof exceptionResponse === 'object' &&
                exceptionResponse !== null
            ) {
                const res = exceptionResponse as any;
                // Handle NestJS validation pipe errors
                if (Array.isArray(res.message)) {
                    message = res.message.join(', ');
                } else {
                    message = res.message ?? message;
                }
            }

            type =
                status >= 500
                    ? 'Error'
                    : status === 401
                        ? 'Unauthorized'
                        : status === 403
                            ? 'Forbidden'
                            : status === 404
                                ? 'NotFound'
                                : status === 409
                                    ? 'Conflict'
                                    : 'Warning';
        } else if (exception instanceof Error) {
            this.logger.error(exception.message, exception.stack);
            message = exception.message;
        }

        response.status(status).json({
            messages: [{ type, description: message }],
            data: null,
        });
    }
}
