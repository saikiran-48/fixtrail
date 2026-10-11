import type { Ticket } from '../../api/types';
import { formatDuration, useNow } from '../../lib/time';

// Shows the SLA countdown. Starts when a service worker takes the ticket,
// and turns into an "overdue" message once the due time passes.
export function SlaTimer({ ticket }: { ticket: Ticket }) {
  const now = useNow();

  if (!ticket.slaDueAt) {
    return (
      <p className="text-sm text-muted">
        The timer starts when a service worker takes this ticket.
      </p>
    );
  }

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return (
      <p className="text-sm text-muted">
        {ticket.overdue ? 'Fixed after the target time.' : 'Fixed within the target time.'}
      </p>
    );
  }

  const remaining = new Date(ticket.slaDueAt).getTime() - now.getTime();
  const overdue = remaining < 0;

  return (
    <div
      className={`inline-flex items-baseline gap-2 rounded-xl px-3.5 py-2 ring-1 ${
        overdue ? 'bg-warn-soft text-warn ring-warn/20' : 'bg-accent-soft text-accent ring-accent/20'
      }`}
      role="timer"
      aria-live="off"
    >
      <span className="text-xs font-medium uppercase tracking-wide">
        {overdue ? 'Overdue by' : 'Time left'}
      </span>
      <span className="font-mono text-lg tabular-nums">{formatDuration(remaining)}</span>
      <span className="text-xs text-muted">target {ticket.slaHours}h</span>
    </div>
  );
}
