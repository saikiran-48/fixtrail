import type { Ticket, TimelineEvent } from '../../api/types';

export type StepState = 'done' | 'current' | 'pending';

export interface TrackerStep {
  key: 'raised' | 'assigned' | 'working' | 'resolved' | 'feedback';
  title: string;
  detail?: string;
  state: StepState;
  at?: string | null;
  // Milestones staff added while work was in progress.
  updates?: TimelineEvent[];
}

const STAGES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'] as const;

// Where a stage sits relative to the ticket's current status:
// the status's own stage is "current", earlier stages are "done", later ones "pending".
function stateOf(stage: (typeof STAGES)[number], status: Ticket['status']): StepState {
  const pos = STAGES.indexOf(status);
  const at = STAGES.indexOf(stage);
  if (at === pos) return 'current';
  return at < pos ? 'done' : 'pending';
}

// Builds the pizza-tracker steps from the ticket's status and timeline.
// Derived on every render, so the tracker always matches the stored data.
export function buildTracker(ticket: Ticket): TrackerStep[] {
  const { status } = ticket;

  // A reopened ticket is "assigned" again, but the work has already started once.
  const workedBefore = !!ticket.startedAt;
  const workingState: StepState =
    status === 'assigned' && workedBefore ? 'done' : stateOf('in_progress', status);

  return [
    {
      key: 'raised',
      title: 'Ticket raised',
      detail: `${ticket.ref} · ${ticket.location.label}`,
      state: 'done',
      at: ticket.createdAt,
    },
    {
      key: 'assigned',
      title: ticket.assignee ? `Assigned to ${ticket.assignee.name}` : 'Waiting for a service worker',
      state: status === 'open' ? 'current' : stateOf('assigned', status),
      at: ticket.assignedAt,
    },
    {
      key: 'working',
      title: 'Work in progress',
      state: workingState,
      at: ticket.startedAt,
      updates: (ticket.timeline ?? []).filter((e) => e.type === 'note'),
    },
    {
      key: 'resolved',
      title: 'Marked as fixed',
      state: stateOf('resolved', status),
      at: ticket.resolvedAt,
    },
    {
      key: 'feedback',
      title: status === 'closed' ? 'Feedback given' : 'Your feedback',
      state: stateOf('closed', status),
      at: ticket.closedAt,
    },
  ];
}
