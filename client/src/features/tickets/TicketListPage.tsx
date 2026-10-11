import { Link } from 'react-router-dom';
import { useMe, useTickets } from '../../api/hooks';
import type { Ticket } from '../../api/types';
import { Button, Card, StatusBadge } from '../../components/ui';
import { CATEGORY_LABELS } from '@fixtrail/shared';
import { formatWhen } from '../../lib/time';

// Home page. Residents see their own tickets; service workers see the open queue
// and the jobs they have taken.
export function TicketListPage() {
  const me = useMe();
  const tickets = useTickets();

  if (tickets.isPending) return <p className="text-sm text-muted">Loading tickets…</p>;
  if (tickets.isError) return <p className="text-sm text-warn">Could not load tickets.</p>;

  const list = tickets.data;

  if (me.data?.role === 'staff') {
    const mine = list.filter((t) => t.assignee?.id === me.data?.id);
    const queue = list.filter((t) => t.status === 'open');
    return (
      <div className="space-y-8">
        <Section title="Open queue" subtitle="Take a ticket to start its timer." tickets={queue} empty="Nothing waiting. Nice work." />
        <Section title="My jobs" tickets={mine} empty="You have no jobs yet. Take one from the queue." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your tickets</h1>
          <p className="text-sm text-muted">{summarise(list)}</p>
        </div>
        <Link to="/tickets/new">
          <Button>Raise a ticket</Button>
        </Link>
      </div>
      <Section title="" tickets={list} empty="You have not raised any tickets yet." />
    </div>
  );
}

// One line that says where things stand, shown straight after login.
function summarise(list: Ticket[]): string {
  if (list.length === 0) return 'Track each one, and leave feedback when it is fixed.';
  const waiting = list.filter((t) => t.status === 'open').length;
  const active = list.filter((t) => t.status === 'assigned' || t.status === 'in_progress').length;
  const fixed = list.filter((t) => t.status === 'resolved').length;
  const parts = [
    waiting && `${waiting} waiting for a service worker`,
    active && `${active} in progress`,
    fixed && `${fixed} waiting for your feedback`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'All your tickets are closed. Thank you for the feedback.';
}

function Section({
  title,
  subtitle,
  tickets,
  empty,
}: {
  title: string;
  subtitle?: string;
  tickets: Ticket[];
  empty: string;
}) {
  return (
    <section className="space-y-3">
      {title && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      )}
      {tickets.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link to={`/tickets/${t.id}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-accent">
                <Card className="p-4 transition-transform duration-150 ease-out hover:-translate-y-px">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted">
                        {t.ref} · {CATEGORY_LABELS[t.category]} · {t.priority === 'urgent' ? 'Urgent' : 'Normal'}
                      </p>
                      <p className="truncate font-medium">{t.description}</p>
                      <p className="text-xs text-muted">
                        {t.location.label} · raised {formatWhen(t.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
