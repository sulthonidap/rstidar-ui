import type { OrderStatus, User, UserRole } from '../types/models';
import { ORDER_STATUS_TRANSITIONS } from '../types/models';

export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  if (!user?.role) return false;
  return roles.includes(user.role.name);
}

/**
 * Which staff role takes each step on the web panel — mirror of the API's
 * enums.StaffCanMove. Admin may take any of them; the courier steps
 * (Dalam pengiriman, Selesai) only happen in the courier app.
 */
const STEP_ROLES: Partial<Record<OrderStatus, UserRole[]>> = {
  confirmed: ['cco'],
  ready_for_pickup: ['farmasi'],
  packed: ['cco'],
  cancelled: ['cco'],
};

export function canMoveOrder(user: User | null, from: OrderStatus, to: OrderStatus): boolean {
  if (!ORDER_STATUS_TRANSITIONS[from].includes(to)) return false;
  const roles = STEP_ROLES[to];
  if (!roles || !user?.role) return false;
  if (user.role.name === 'admin') return true;
  if (to === 'cancelled' && from === 'on_delivery') return false;
  return roles.includes(user.role.name);
}

/** Ops can (re)assign the courier from confirmation until the courier takes the package. */
export const ASSIGNABLE_STATUSES: OrderStatus[] = ['confirmed', 'ready_for_pickup', 'packed'];

export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'admin');
}

/** Panel pages limited to some roles (same rules as the sidebar and the API); the rest are open to all staff. */
const PAGE_ROLES: [prefix: string, roles: UserRole[]][] = [
  ['/orders/baru', ['admin', 'cco', 'farmasi']],
  ['/customers', ['admin', 'cco', 'farmasi']],
  ['/couriers', ['admin', 'ops']],
  ['/transactions', ['admin', 'finance']],
  ['/pengaturan', ['admin']],
  ['/services', ['admin']],
  ['/users', ['admin']],
];

/** Whether `user` may open the panel page at `path` (used for the after-login redirect). */
export function canVisit(user: User | null, path: string): boolean {
  const pathname = path.split(/[?#]/)[0];
  const rule = PAGE_ROLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
  return !rule || hasRole(user, ...rule[1]);
}
