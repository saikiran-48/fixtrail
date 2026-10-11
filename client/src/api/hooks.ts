import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { CurrentUser, Ticket } from './types';

// Query keys in one place, so invalidation after a change always hits the right screens.
export const keys = {
  me: ['me'] as const,
  tickets: ['tickets'] as const,
  ticket: (id: string) => ['tickets', id] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api<{ user: CurrentUser }>('/auth/me').then((r) => r.user),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; role: 'resident' | 'staff' }) =>
      api<{ user: CurrentUser }>('/auth/login', { body: input }),
    onSuccess: (data) => {
      qc.setQueryData(keys.me, data.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useTickets() {
  return useQuery({
    queryKey: keys.tickets,
    queryFn: () => api<{ tickets: Ticket[] }>('/tickets').then((r) => r.tickets),
    // Staff and residents both see changes made by the other side, so refresh regularly.
    refetchInterval: 20_000,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: keys.ticket(id),
    queryFn: () => api<{ ticket: Ticket }>(`/tickets/${id}`).then((r) => r.ticket),
    refetchInterval: 15_000,
  });
}

// Every ticket action goes through here: it writes the response into the cache
// and refreshes the lists, so the screen updates straight away.
export function useTicketAction<TInput = unknown>(
  ticketId: string,
  action: 'assign' | 'status' | 'updates' | 'confirm' | 'reopen',
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: TInput) =>
      api<{ ticket: Ticket }>(`/tickets/${ticketId}/${action}`, {
        method: 'POST',
        body: body ?? {},
      }).then((r) => r.ticket),
    onSuccess: (ticket) => {
      qc.setQueryData(keys.ticket(ticketId), ticket);
      qc.invalidateQueries({ queryKey: keys.tickets });
    },
  });
}

export function useRaiseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api<{ ticket: Ticket }>('/tickets', { body }).then((r) => r.ticket),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tickets });
    },
  });
}
