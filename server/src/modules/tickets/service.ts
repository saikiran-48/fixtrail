import { Types, type FilterQuery } from 'mongoose';
import type {
  ConfirmInput,
  CreateTicketInput,
  ProgressUpdateInput,
  ReopenInput,
  StatusChangeInput,
} from '@fixtrail/shared';
import { AppError } from '../../middleware/error.js';
import type { AuthUser } from '../../middleware/auth.js';
import { dueAt, isOverdue, slaHours } from '../../lib/sla.js';
import { nextTicketRef } from '../../models/counter.js';
import { Ticket, type TicketDoc } from '../../models/ticket.js';
import { TicketEvent } from '../../models/ticketEvent.js';

// Business rules for tickets. Routes call these; they never touch the
// database directly. Each state change also writes a TicketEvent row.

export function toTicketView(t: TicketDoc) {
  return {
    id: t._id.toString(),
    ref: t.ref,
    category: t.category,
    priority: t.priority,
    description: t.description,
    location: t.location,
    status: t.status,
    residentId: t.residentId.toString(),
    residentName: t.residentName,
    assignee: t.assigneeId
      ? { id: t.assigneeId.toString(), name: t.assigneeName ?? '' }
      : null,
    assignedAt: t.assignedAt ?? null,
    slaHours: t.slaHours ?? null,
    slaDueAt: t.slaDueAt ?? null,
    overdue: isOverdue(t.slaDueAt, t.status),
    startedAt: t.startedAt ?? null,
    resolvedAt: t.resolvedAt ?? null,
    closedAt: t.closedAt ?? null,
    rating: t.rating ?? null,
    review: t.review ?? null,
    reopenCount: t.reopenCount ?? 0,
    createdAt: t.createdAt,
  };
}

function toEventView(e: InstanceType<typeof TicketEvent>) {
  return {
    id: e._id.toString(),
    type: e.type,
    actorName: e.actorName,
    from: e.from ?? null,
    to: e.to ?? null,
    note: e.note ?? null,
    at: e.at,
  };
}

// Who can see a ticket. Used for both single reads and list scoping.
function canView(user: AuthUser, t: TicketDoc): boolean {
  if (user.role === 'manager') return true;
  if (user.role === 'resident') return t.residentId.equals(user.id);
  // Staff: the open queue, or tickets assigned to them.
  return t.status === 'open' || (t.assigneeId?.equals(user.id) ?? false);
}

function listScope(user: AuthUser): FilterQuery<TicketDoc> {
  if (user.role === 'manager') return {};
  if (user.role === 'resident') return { residentId: user.id };
  return { $or: [{ status: 'open' }, { assigneeId: user.id }] };
}

async function loadVisible(user: AuthUser, id: string): Promise<TicketDoc> {
  if (!Types.ObjectId.isValid(id)) throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  const t = await Ticket.findById(id);
  // Return 404 for tickets the user can't see, so their existence isn't leaked.
  if (!t || !canView(user, t)) throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  return t;
}

async function recordEvent(
  ticketId: Types.ObjectId,
  actor: AuthUser,
  event: { type: string; from?: string; to?: string; note?: string },
) {
  await TicketEvent.create({
    ticketId,
    actorId: actor.id,
    actorName: actor.name,
    at: new Date(),
    ...event,
  });
}

export async function createTicket(resident: AuthUser, input: CreateTicketInput) {
  const ticket = await Ticket.create({
    ref: await nextTicketRef(),
    residentId: resident.id,
    residentName: resident.name,
    category: input.category,
    priority: input.priority,
    description: input.description,
    location: input.location,
    status: 'open',
  });
  await recordEvent(ticket._id, resident, { type: 'raised', to: 'open' });
  return toTicketView(ticket);
}

export async function listTickets(user: AuthUser, status?: string) {
  const filter: FilterQuery<TicketDoc> = { ...listScope(user) };
  if (status) filter.status = status;
  const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).limit(100);
  return tickets.map(toTicketView);
}

export async function getTicket(user: AuthUser, id: string) {
  const t = await loadVisible(user, id);
  const events = await TicketEvent.find({ ticketId: t._id }).sort({ at: 1 });
  return { ...toTicketView(t), timeline: events.map(toEventView) };
}

// Staff take a ticket. The atomic filter on status 'open' means only one
// staff member can win, even if two click at the same moment.
export async function assignToSelf(staff: AuthUser, id: string) {
  const t = await loadVisible(staff, id);
  if (t.status !== 'open') {
    throw new AppError(409, 'ALREADY_ASSIGNED', 'Someone has already taken this ticket');
  }

  const now = new Date();
  const hours = slaHours(t.category, t.priority);
  const updated = await Ticket.findOneAndUpdate(
    { _id: t._id, status: 'open' },
    {
      $set: {
        status: 'assigned',
        assigneeId: staff.id,
        assigneeName: staff.name,
        assignedAt: now,
        slaHours: hours,
        slaDueAt: dueAt(now, hours),
      },
    },
    { new: true },
  );
  if (!updated) {
    throw new AppError(409, 'ALREADY_ASSIGNED', 'Someone has already taken this ticket');
  }

  await recordEvent(updated._id, staff, { type: 'assigned', from: 'open', to: 'assigned' });
  return toTicketView(updated);
}

function requireAssignee(user: AuthUser, t: TicketDoc) {
  const isAssignee = t.assigneeId?.equals(user.id) ?? false;
  if (!isAssignee && user.role !== 'manager') {
    throw new AppError(403, 'FORBIDDEN', 'Only the assigned staff member can do this');
  }
}

// Move forward through the tracker: assigned -> in_progress -> resolved.
export async function changeStatus(user: AuthUser, id: string, input: StatusChangeInput) {
  const t = await loadVisible(user, id);
  requireAssignee(user, t);

  const from = input.status === 'in_progress' ? 'assigned' : 'in_progress';
  if (t.status !== from) {
    throw new AppError(
      409,
      'INVALID_TRANSITION',
      `Cannot move from ${t.status} to ${input.status}`,
    );
  }

  const now = new Date();
  const set: Record<string, unknown> = { status: input.status };
  if (input.status === 'in_progress') set.startedAt = now;
  if (input.status === 'resolved') set.resolvedAt = now;

  // Atomic on the expected current status, so a double click can't skip a step.
  const updated = await Ticket.findOneAndUpdate({ _id: t._id, status: from }, { $set: set }, { new: true });
  if (!updated) {
    throw new AppError(409, 'INVALID_TRANSITION', 'This ticket changed. Please refresh');
  }

  await recordEvent(updated._id, user, {
    type: 'status',
    from,
    to: input.status,
    note: input.note,
  });
  return toTicketView(updated);
}

// "Add a few more" steps: milestones shown on the tracker without changing status.
export async function addProgressUpdate(user: AuthUser, id: string, input: ProgressUpdateInput) {
  const t = await loadVisible(user, id);
  requireAssignee(user, t);
  if (t.status !== 'assigned' && t.status !== 'in_progress') {
    throw new AppError(409, 'INVALID_TRANSITION', 'Updates can only be added while work is active');
  }
  await recordEvent(t._id, user, { type: 'note', note: input.message });
  const events = await TicketEvent.find({ ticketId: t._id }).sort({ at: 1 });
  return { ...toTicketView(t), timeline: events.map(toEventView) };
}

// Resident confirms the fix and leaves feedback. Closes the ticket.
export async function confirmFix(resident: AuthUser, id: string, input: ConfirmInput) {
  const t = await loadVisible(resident, id);
  if (!t.residentId.equals(resident.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the resident who raised this can confirm it');
  }
  if (t.status !== 'resolved') {
    throw new AppError(409, 'INVALID_TRANSITION', 'You can confirm once the work is marked resolved');
  }

  const updated = await Ticket.findOneAndUpdate(
    { _id: t._id, status: 'resolved' },
    {
      $set: {
        status: 'closed',
        closedAt: new Date(),
        rating: input.rating,
        review: input.review,
      },
    },
    { new: true },
  );
  if (!updated) {
    throw new AppError(409, 'INVALID_TRANSITION', 'This ticket changed. Please refresh');
  }

  await recordEvent(updated._id, resident, {
    type: 'rated',
    from: 'resolved',
    to: 'closed',
    note: input.review ? `${input.rating}/5: ${input.review}` : `${input.rating}/5`,
  });
  return toTicketView(updated);
}

// Resident says the fix did not hold. Goes back to the assignee.
export async function reopen(resident: AuthUser, id: string, input: ReopenInput) {
  const t = await loadVisible(resident, id);
  if (!t.residentId.equals(resident.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the resident who raised this can reopen it');
  }
  if (t.status !== 'resolved') {
    throw new AppError(409, 'INVALID_TRANSITION', 'Only resolved tickets can be reopened');
  }

  const updated = await Ticket.findOneAndUpdate(
    { _id: t._id, status: 'resolved' },
    { $set: { status: 'assigned', resolvedAt: null }, $inc: { reopenCount: 1 } },
    { new: true },
  );
  if (!updated) {
    throw new AppError(409, 'INVALID_TRANSITION', 'This ticket changed. Please refresh');
  }

  await recordEvent(updated._id, resident, {
    type: 'reopened',
    from: 'resolved',
    to: 'assigned',
    note: input.reason,
  });
  return toTicketView(updated);
}
