import { describe, expect, it } from 'vitest';
import { dueAt, isOverdue, slaHours } from '../src/lib/sla.js';

// These rules decide what staff and residents see as "late", so they are tested directly.
describe('SLA rules', () => {
  it('uses the PRD table for urgent and normal priority', () => {
    expect(slaHours('plumbing', 'urgent')).toBe(4);
    expect(slaHours('plumbing', 'normal')).toBe(24);
    expect(slaHours('lift', 'urgent')).toBe(2);
    expect(slaHours('security', 'urgent')).toBe(1);
    expect(slaHours('common_area', 'normal')).toBe(72);
  });

  it('adds the hours to the start time', () => {
    const start = new Date('2026-10-12T10:00:00Z');
    expect(dueAt(start, 4).toISOString()).toBe('2026-10-12T14:00:00.000Z');
  });

  it('is overdue only after the due time and while not resolved', () => {
    const due = new Date('2026-10-12T14:00:00Z');
    const before = new Date('2026-10-12T13:59:00Z');
    const after = new Date('2026-10-12T14:01:00Z');

    expect(isOverdue(due, 'in_progress', before)).toBe(false);
    expect(isOverdue(due, 'in_progress', after)).toBe(true);
    expect(isOverdue(due, 'resolved', after)).toBe(false);
    expect(isOverdue(due, 'closed', after)).toBe(false);
  });

  it('is never overdue before the SLA clock has started', () => {
    expect(isOverdue(undefined, 'open', new Date())).toBe(false);
  });
});
