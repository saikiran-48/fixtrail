import type { Category, Priority } from '@fixtrail/shared';

// SLA hours from the PRD table. These are starting values; the PRD lists them as
// open questions for the facility manager. Kept in code for now so the rules are
// easy to read and test. They can move into a database collection later.
const SLA_HOURS: Record<Category, Record<Priority, number>> = {
  plumbing: { urgent: 4, normal: 24 },
  electrical: { urgent: 4, normal: 24 },
  lift: { urgent: 2, normal: 24 },
  common_area: { urgent: 24, normal: 72 },
  security: { urgent: 1, normal: 24 },
};

export function slaHours(category: Category, priority: Priority): number {
  return SLA_HOURS[category][priority];
}

// Due time is computed from the moment the ticket starts its clock.
export function dueAt(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

// Overdue is derived from timestamps on read, never stored as a flag.
export function isOverdue(
  slaDueAt: Date | null | undefined,
  status: string,
  now: Date = new Date(),
): boolean {
  if (!slaDueAt) return false;
  if (status === 'resolved' || status === 'closed') return false;
  return slaDueAt.getTime() < now.getTime();
}
