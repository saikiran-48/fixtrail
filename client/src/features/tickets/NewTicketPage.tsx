import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES, CATEGORY_LABELS, createTicketSchema, type Category, type Priority } from '@fixtrail/shared';
import { ApiError } from '../../api/client';
import { useRaiseTicket } from '../../api/hooks';
import { Button, Card, Field, SelectField, TextArea, TextInput } from '../../components/ui';

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));
const LOCATION_OPTIONS: { value: 'flat' | 'common_area'; label: string }[] = [
  { value: 'flat', label: 'In my flat' },
  { value: 'common_area', label: 'Common area' },
];

export function NewTicketPage() {
  const navigate = useNavigate();
  const raise = useRaiseTicket();

  const [category, setCategory] = useState<Category>('plumbing');
  const [priority, setPriority] = useState<Priority>('normal');
  const [locationType, setLocationType] = useState<'flat' | 'common_area'>('flat');
  const [locationLabel, setLocationLabel] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createTicketSchema.safeParse({
      category,
      priority,
      description,
      location: { type: locationType, label: locationLabel },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }

    try {
      const ticket = await raise.mutateAsync(parsed.data);
      navigate(`/tickets/${ticket.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not raise the ticket. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link to="/" className="text-sm text-accent hover:underline">
          ← Back to your tickets
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Raise a ticket</h1>
        <p className="text-sm text-muted">Tell us what is wrong. A service worker will pick it up.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field label="What kind of problem?">
            <SelectField<Category>
              ariaLabel="Category"
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
            />
          </Field>

          <Field label="How urgent is it?">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Priority">
              {(['normal', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={priority === p}
                  onClick={() => setPriority(p)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition-colors duration-150 ease-out ${
                    priority === p ? 'bg-accent text-white ring-accent' : 'bg-surface text-ink ring-line hover:bg-paper'
                  }`}
                >
                  {p === 'normal' ? 'Normal' : 'Urgent'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Where is it?">
            <SelectField<'flat' | 'common_area'>
              ariaLabel="Location type"
              value={locationType}
              onChange={setLocationType}
              options={LOCATION_OPTIONS}
            />
          </Field>

          <Field label="Location details" hint="For example: Block A, Flat 304, or Lift lobby, ground floor.">
            <TextInput
              placeholder="Block A, Flat 304"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
            />
          </Field>

          <Field label="Describe the problem" hint="At least 10 characters. The more detail, the faster it gets fixed.">
            <TextArea
              placeholder="e.g. The kitchen tap leaks under the sink and the floor is wet."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-warn">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={raise.isPending}>
            {raise.isPending ? 'Raising…' : 'Raise ticket'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
