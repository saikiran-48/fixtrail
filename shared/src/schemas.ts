import { z } from 'zod';
import { CATEGORIES, PRIORITIES, TICKET_STATUSES } from './constants.js';

// Every request body is validated with these. `.strict()` rejects unknown
// fields, so a client can't send something like `status` or `role` on create.

// Demo login: identity is the email, role is chosen at login.
// Manager is not offered in the test build yet.
export const loginSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(['resident', 'staff']),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const createTicketSchema = z
  .object({
    category: z.enum(CATEGORIES),
    priority: z.enum(PRIORITIES),
    description: z.string().trim().min(10).max(2000),
    location: z
      .object({
        type: z.enum(['flat', 'common_area']),
        label: z.string().trim().min(1).max(120),
      })
      .strict(),
  })
  .strict();
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// Staff move a ticket forward. Only these two targets are allowed from the UI.
export const statusChangeSchema = z
  .object({
    status: z.enum(['in_progress', 'resolved']),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

// Staff add a milestone to the tracker ("Parts ordered", "Pipe replaced").
export const progressUpdateSchema = z
  .object({
    message: z.string().trim().min(2).max(500),
  })
  .strict();
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;

// Resident feedback once the work is resolved.
export const confirmSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(1000).optional(),
  })
  .strict();
export type ConfirmInput = z.infer<typeof confirmSchema>;

// Resident says the fix did not hold.
export const reopenSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export type ReopenInput = z.infer<typeof reopenSchema>;

export const ticketStatusSchema = z.enum(TICKET_STATUSES);
