import { model, Schema, Types } from 'mongoose';

// Every change to a ticket writes one event. The pizza tracker and the audit
// trail both read from this collection, so nothing is lost on a refresh.
const ticketEventSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    type: {
      type: String,
      enum: ['raised', 'assigned', 'status', 'note', 'reopened', 'rated'],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    from: { type: String },
    to: { type: String },
    note: { type: String, maxlength: 1000 },
    at: { type: Date, default: () => new Date(), required: true },
  },
  { versionKey: false },
);

ticketEventSchema.index({ ticketId: 1, at: 1 });

export const TicketEvent = model('TicketEvent', ticketEventSchema);
