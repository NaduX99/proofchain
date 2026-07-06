import type { UserRole } from '../enums/user-role.enum';

export interface UserRow {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
