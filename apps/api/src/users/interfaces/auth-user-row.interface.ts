import type { UserRole } from '../enums/user-role.enum';

export interface AuthUserRow {
  id: string;
  organizationId: string;
  organizationSlug: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  passwordHash: string;
  refreshTokenHash: string | null;
  createdAt: Date;
}
