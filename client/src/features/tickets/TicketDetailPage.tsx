import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CATEGORY_LABELS } from '@fixtrail/shared';
import { ApiError } from '../../api/client';
import { useMe, useTicket, useTicketAction } from '../../api/hooks';
import type { CurrentUser, Ticket } from '../../api/types';
import { Button, Card, Notice, StatusBadge, TextArea } from '../../components/ui';
import { formatWhen } from '../../lib/time';
import { PizzaTracker } from './PizzaTracker';
import { SlaTimer } from './SlaTimer';

export function TicketDetailPage() {
  const { id = '' } = useParams();
  const me = useMe();
  const ticketQuery = useTicket(id);

  if (ticketQuery.isPending) return <p className="text-sm text-muted">Loading…</p>;
  if (ticketQuery.isError) {
    const notFound = ticketQuery.error instanceof ApiError && ticketQuery.error.status === 404;
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-sm text-warn">
          {notFound ? 'We could not find that ticket. It may belong to someone else.' : 'Could not load this ticket.'}
        </p>
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const user = me.data;

  return (
    <div className="space-y-6">
      <BackLink />

      <Card className="p-6 space-y-5">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-mono">{ticket.ref}</span>
            <span>·</span>
            <span>{CATEGORY_LABELS[ticket.category]}</span>
            <span>·</span>
            <span>{ticket.priority === 'urgent' ? 'Urgent' : 'Normal'}</span>
          </div>
          <h1 className="text-lg font-semibold leading-snug">{ticket.description}</h1>
          <p className="text-sm text-muted">
            {ticket.location.label} · raised by {ticket.residentName} {formatWhen(ticket.createdAt)}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <StatusBadge status={ticket.status} />
          </div>
        </header>

        <SlaTimer ticket={ticket} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Progress</h2>
        <PizzaTracker ticket={ticket} />
      </Card>

      {user && user.role === 'staff' && <StaffActions ticket={ticket} user={user} />}
      {user && user.role === 'resident' && ticket.residentId === user.id && (
        <ResidentActions ticket={ticket} />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/" className="text-sm text-accent hover:underline">
      ← Back
    </Link>
  );
}

function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  return (
    <p role="alert" className="text-sm text-warn">
      {message}
    </p>
  );
}

// ---- Service worker: take it, work it, finish it ----

function StaffActions({ ticket, user }: { ticket: Ticket; user: CurrentUser }) {
  const assign = useTicketAction(ticket.id, 'assign');
  const start = useTicketAction<{ status: 'in_progress' }>(ticket.id, 'status');
  const update = useTicketAction<{ message: string }>(ticket.id, 'updates');
  const finish = useTicketAction<{ status: 'resolved'; note?: string }>(ticket.id, 'status');

  const mine = ticket.assignee?.id === user.id;
  const [message, setMessage] = useState('');
  const [finishNote, setFinishNote] = useState('');
  const [updateError, setUpdateError] = useState<unknown>(null);

  if (ticket.status === 'open') {
    return (
      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Take this ticket</h2>
        <p className="text-sm text-muted">Taking it assigns it to you and starts the timer.</p>
        <Button onClick={() => assign.mutate(undefined)} disabled={assign.isPending}>
          {assign.isPending ? 'Taking…' : 'Assign to me'}
        </Button>
        <ActionError error={assign.error} />
      </Card>
    );
  }

  if (!mine) {
    return (
      <Notice>
        This ticket is with {ticket.assignee?.name ?? 'another service worker'}.
      </Notice>
    );
  }

  if (ticket.status === 'assigned') {
    return (
      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Ready to start?</h2>
        <p className="text-sm text-muted">Moving it to work in progress tells the resident you are on it.</p>
        <Button onClick={() => start.mutate({ status: 'in_progress' })} disabled={start.isPending}>
          {start.isPending ? 'Starting…' : 'Start work'}
        </Button>
        <ActionError error={start.error} />
      </Card>
    );
  }

  if (ticket.status === 'in_progress') {
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Add a progress update</h2>
          <p className="text-sm text-muted">Each update appears on the tracker for the resident.</p>
          <form
            className="space-y-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setUpdateError(null);
              update.mutate(
                { message },
                {
                  onSuccess: () => setMessage(''),
                  onError: (err) => setUpdateError(err),
                },
              );
            }}
          >
            <TextArea
              placeholder="e.g. Replacement washer ordered, will fit tomorrow morning"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
            <Button type="submit" variant="secondary" disabled={update.isPending || message.trim().length < 2}>
              {update.isPending ? 'Adding…' : 'Add update'}
            </Button>
            <ActionError error={updateError} />
          </form>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Finished?</h2>
          <p className="text-sm text-muted">Mark it fixed. The resident will be asked to confirm and rate it.</p>
          <TextArea
            placeholder="Optional: what was done?"
            value={finishNote}
            onChange={(e) => setFinishNote(e.target.value)}
            maxLength={500}
          />
          <Button
            onClick={() => finish.mutate({ status: 'resolved', note: finishNote.trim() || undefined })}
            disabled={finish.isPending}
          >
            {finish.isPending ? 'Saving…' : 'Mark as fixed'}
          </Button>
          <ActionError error={finish.error} />
        </Card>
      </div>
    );
  }

  return null;
}

// ---- Resident: confirm the fix and leave feedback, or reopen it ----

function ResidentActions({ ticket }: { ticket: Ticket }) {
  if (ticket.status === 'closed') {
    return (
      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Your feedback</h2>
        <Stars value={ticket.rating ?? 0} readOnly />
        {ticket.review ? <p className="text-sm">{ticket.review}</p> : <p className="text-sm text-muted">No written review.</p>}
        <p className="text-xs text-muted">Thanks for helping us measure how well we fix things.</p>
      </Card>
    );
  }

  if (ticket.status !== 'resolved') {
    return (
      <Notice>
        You will be able to confirm the fix and leave feedback once the service worker marks it as fixed.
      </Notice>
    );
  }

  return <FeedbackForm ticket={ticket} />;
}

function FeedbackForm({ ticket }: { ticket: Ticket }) {
  const confirm = useTicketAction<{ rating: number; review?: string }>(ticket.id, 'confirm');
  const reopen = useTicketAction<{ reason: string }>(ticket.id, 'reopen');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [reason, setReason] = useState('');
  const [showReopen, setShowReopen] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Is it fixed?</h2>
          <p className="text-sm text-muted">Confirm the fix, rate the work, and leave a review if you like.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (rating === 0) return;
            confirm.mutate({ rating, review: review.trim() || undefined });
          }}
        >
          <div className="space-y-2">
            <span className="text-sm font-medium">How did we do?</span>
            <Stars value={rating} onChange={setRating} />
          </div>

          <TextArea
            placeholder="Optional: how was the visit and the work?"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={1000}
          />

          <Button type="submit" disabled={rating === 0 || confirm.isPending}>
            {confirm.isPending ? 'Sending…' : 'Confirm and submit feedback'}
          </Button>
          <ActionError error={confirm.error} />
        </form>
      </Card>

      <Card className="p-6 space-y-3">
        {!showReopen ? (
          <button
            onClick={() => setShowReopen(true)}
            className="text-sm text-warn hover:underline"
          >
            It is not fixed yet. Reopen this ticket.
          </button>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              reopen.mutate({ reason: reason.trim() });
            }}
          >
            <h2 className="font-semibold">Reopen this ticket</h2>
            <TextArea
              placeholder="What is still wrong?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" disabled={reason.trim().length < 3 || reopen.isPending}>
                {reopen.isPending ? 'Reopening…' : 'Send back to service worker'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowReopen(false)}>
                Cancel
              </Button>
            </div>
            <ActionError error={reopen.error} />
          </form>
        )}
      </Card>
    </div>
  );
}

function Stars({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        readOnly ? (
          <span key={n} className={`text-2xl ${n <= value ? 'text-warn' : 'text-line'}`} aria-hidden>
            ★
          </span>
        ) : (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange?.(n)}
            className={`text-3xl leading-none transition-transform duration-150 ease-out active:scale-90 ${
              n <= value ? 'text-warn' : 'text-line hover:text-muted'
            }`}
          >
            ★
          </button>
        ),
      )}
    </div>
  );
}
