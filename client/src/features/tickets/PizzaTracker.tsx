import type { Ticket } from '../../api/types';
import { formatWhen } from '../../lib/time';
import { buildTracker, type TrackerStep } from './tracker';

// The pizza tracker: each stage of the job, where it is now, and what staff added along the way.
export function PizzaTracker({ ticket }: { ticket: Ticket }) {
  const steps = buildTracker(ticket);

  return (
    <ol className="space-y-0" aria-label="Ticket progress">
      {steps.map((step, i) => (
        <Step key={step.key} step={step} isLast={i === steps.length - 1} />
      ))}
    </ol>
  );
}

function Step({ step, isLast }: { step: TrackerStep; isLast: boolean }) {
  const dotStyle =
    step.state === 'done'
      ? 'bg-accent text-white'
      : step.state === 'current'
        ? 'bg-surface text-accent ring-2 ring-accent animate-pulse-soft'
        : 'bg-paper text-muted ring-1 ring-line';

  const titleStyle = step.state === 'pending' ? 'text-muted' : 'text-ink font-medium';

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* connecting line down to the next step */}
      {!isLast && (
        <span
          aria-hidden
          className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px ${
            step.state === 'done' ? 'bg-accent/40' : 'bg-line'
          }`}
        />
      )}

      <span
        className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${dotStyle}`}
        aria-hidden
      >
        {step.state === 'done' ? '✓' : step.state === 'current' ? '•' : ''}
      </span>

      <div className="min-w-0 flex-1 pt-1">
        <p className={`text-sm ${titleStyle}`}>
          {step.title}
          {step.state === 'current' && <span className="sr-only"> (current step)</span>}
        </p>
        {step.detail && <p className="text-xs text-muted">{step.detail}</p>}
        {step.at && step.state !== 'pending' && (
          <p className="text-xs text-muted">{formatWhen(step.at)}</p>
        )}

        {step.updates && step.updates.length > 0 && (
          <ul className="mt-3 space-y-2 border-l border-line pl-3">
            {step.updates.map((u) => (
              <li key={u.id} className="text-sm text-ink">
                {u.note}
                <span className="block text-xs text-muted">
                  {u.actorName} · {formatWhen(u.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
