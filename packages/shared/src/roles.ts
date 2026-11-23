import { z } from 'zod';

/** Platform roles. super_admin = CMind staff (cross-school); school_admin = one per school. */
export const ROLES = ['super_admin', 'school_admin', 'instructor', 'student', 'parent'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

/** Where each role lands after login. Route guards are UX only; the API and RLS enforce access. */
export const ROLE_HOME: Record<Role, string> = {
  super_admin: '/platform',
  school_admin: '/school',
  instructor: '/teach',
  student: '/learn',
  parent: '/family',
};

export const homeFor = (role: Role): string => ROLE_HOME[role];
