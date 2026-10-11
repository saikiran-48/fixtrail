// Single source of truth for values both the client and the API depend on.
// Changing an enum here updates the form, the API validation and the types together.
// Kept in its own file so schemas.ts can import it without a circular dependency.

export const CATEGORIES = [
  'plumbing',
  'electrical',
  'lift',
  'common_area',
  'security',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  lift: 'Lift',
  common_area: 'Common area',
  security: 'Security',
};

export const PRIORITIES = ['urgent', 'normal'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ROLES = ['resident', 'staff', 'manager'] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const MAX_PHOTOS = 3;
export const PAGE_SIZE_DEFAULT = 20;
