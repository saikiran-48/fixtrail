// Shapes returned by the API. Kept next to the client so UI code reads plainly.

export type Role = 'resident' | 'staff' | 'manager';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TimelineEvent {
  id: string;
  type: 'raised' | 'assigned' | 'status' | 'note' | 'reopened' | 'rated';
  actorName: string;
  from: string | null;
  to: string | null;
  note: string | null;
  at: string;
}

export interface Ticket {
  id: string;
  ref: string;
  category: 'plumbing' | 'electrical' | 'lift' | 'common_area' | 'security';
  priority: 'urgent' | 'normal';
  description: string;
  location: { type: 'flat' | 'common_area'; label: string };
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  residentId: string;
  residentName: string;
  assignee: { id: string; name: string } | null;
  assignedAt: string | null;
  slaHours: number | null;
  slaDueAt: string | null;
  overdue: boolean;
  startedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  rating: number | null;
  review: string | null;
  reopenCount: number;
  createdAt: string;
  timeline?: TimelineEvent[];
}
