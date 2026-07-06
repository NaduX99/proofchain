import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { catchError, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AuditService } from '../audit.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!action) {
      return next.handle();
    }

    const http = context.switchToHttp();

    const request = http.getRequest<RequestWithUser>();

    const response = http.getResponse<Response>();

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        void this.auditService.create({
          organizationId: request.user?.organizationId ?? null,

          userId: request.user?.sub ?? null,

          action,

          method: request.method,

          path: request.originalUrl ?? request.url,

          statusCode: response.statusCode,

          success: true,

          ipAddress: this.getClientIp(request),

          userAgent: request.get('user-agent') ?? null,

          requestBody: this.cleanRequestBody(request.body),

          errorMessage: null,
        });

        void startedAt;
      }),

      catchError((error: unknown) => {
        void this.auditService.create({
          organizationId: request.user?.organizationId ?? null,

          userId: request.user?.sub ?? null,

          action,

          method: request.method,

          path: request.originalUrl ?? request.url,

          statusCode: response.statusCode || 500,

          success: false,

          ipAddress: this.getClientIp(request),

          userAgent: request.get('user-agent') ?? null,

          requestBody: this.cleanRequestBody(request.body),

          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });

        return throwError(() => error);
      }),
    );
  }

  private getClientIp(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip ?? request.socket.remoteAddress ?? null;
  }

  private cleanRequestBody(body: unknown): Record<string, unknown> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return {};
    }

    const record = body as Record<string, unknown>;

    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret')
      ) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }
}
