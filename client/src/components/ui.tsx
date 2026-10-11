import * as Select from '@radix-ui/react-select';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

// Small set of primitives. Everything is styled from the tokens in index.css.

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface shadow-card ring-1 ring-line animate-rise ${className}`}>
      {children}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ' +
    'transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] ' +
    'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-surface text-ink ring-1 ring-line hover:bg-paper',
    ghost: 'text-accent hover:bg-accent-soft',
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-ink ring-1 ring-line ' +
  'placeholder:text-muted/70 focus:outline-2 focus:outline-accent';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputBase} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputBase} min-h-24 resize-y`} {...props} />;
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const styles =
    tone === 'warn' ? 'bg-warn-soft text-warn ring-warn/20' : 'bg-accent-soft text-accent ring-accent/20';
  return <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${styles}`}>{children}</div>;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Waiting for a service worker',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Fixed, awaiting your feedback',
  closed: 'Closed',
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'closed'
      ? 'bg-done/10 text-done'
      : status === 'resolved'
        ? 'bg-accent-soft text-accent'
        : status === 'open'
          ? 'bg-warn-soft text-warn'
          : 'bg-paper text-ink ring-1 ring-line';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// Dropdown built on Radix, so keyboard and screen-reader behaviour is handled for us.
export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={`${inputBase} flex items-center justify-between text-left`}
      >
        <Select.Value />
        <Select.Icon className="text-muted">▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-xl bg-surface p-1 shadow-card ring-1 ring-line animate-rise"
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-ink outline-none data-highlighted:bg-accent-soft"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
