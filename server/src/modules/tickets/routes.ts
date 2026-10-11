import { Router } from 'express';
import {
  confirmSchema,
  createTicketSchema,
  progressUpdateSchema,
  reopenSchema,
  statusChangeSchema,
  ticketStatusSchema,
} from '@fixtrail/shared';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async.js';
import * as tickets from './service.js';

export const ticketsRouter = Router();

// Every ticket route needs a logged-in user. Role checks sit per route.
ticketsRouter.use(requireAuth);

ticketsRouter.post(
  '/',
  requireRole('resident'),
  asyncHandler(async (req, res) => {
    const input = createTicketSchema.parse(req.body);
    res.status(201).json({ ticket: await tickets.createTicket(req.user!, input) });
  }),
);

ticketsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status ? ticketStatusSchema.parse(req.query.status) : undefined;
    res.json({ tickets: await tickets.listTickets(req.user!, status) });
  }),
);

ticketsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ ticket: await tickets.getTicket(req.user!, req.params.id) });
  }),
);

ticketsRouter.post(
  '/:id/assign',
  requireRole('staff'),
  asyncHandler(async (req, res) => {
    res.json({ ticket: await tickets.assignToSelf(req.user!, req.params.id) });
  }),
);

ticketsRouter.post(
  '/:id/status',
  requireRole('staff', 'manager'),
  asyncHandler(async (req, res) => {
    const input = statusChangeSchema.parse(req.body);
    res.json({ ticket: await tickets.changeStatus(req.user!, req.params.id, input) });
  }),
);

ticketsRouter.post(
  '/:id/updates',
  requireRole('staff', 'manager'),
  asyncHandler(async (req, res) => {
    const input = progressUpdateSchema.parse(req.body);
    res.json({ ticket: await tickets.addProgressUpdate(req.user!, req.params.id, input) });
  }),
);

ticketsRouter.post(
  '/:id/confirm',
  requireRole('resident'),
  asyncHandler(async (req, res) => {
    const input = confirmSchema.parse(req.body);
    res.json({ ticket: await tickets.confirmFix(req.user!, req.params.id, input) });
  }),
);

ticketsRouter.post(
  '/:id/reopen',
  requireRole('resident'),
  asyncHandler(async (req, res) => {
    const input = reopenSchema.parse(req.body);
    res.json({ ticket: await tickets.reopen(req.user!, req.params.id, input) });
  }),
);
