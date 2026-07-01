import type { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  organizationId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}
