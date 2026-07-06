import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'proofchain:audit-action';

export const AuditAction = (action: string): MethodDecorator =>
  SetMetadata(AUDIT_ACTION_KEY, action);
