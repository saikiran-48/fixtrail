import { model, Schema, Types, type InferSchemaType } from 'mongoose';

const ticketSchema = new Schema(
  {
    ref: { type: String, required: true, unique: true }, // e.g. FT-0042, easy to quote
    residentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    residentName: { type: String, required: true },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'lift', 'common_area', 'security'],
      required: true,
    },
    priority: { type: String, enum: ['urgent', 'normal'], required: true },
    description: { type: String, required: true, maxlength: 2000 },
    location: {
      type: { type: String, enum: ['flat', 'common_area'], required: true },
      label: { type: String, required: true, maxlength: 120 },
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      required: true,
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    assigneeName: { type: String },
    // The SLA clock starts when staff take the ticket (per the test-build flow),
    // not when it is raised. The PRD says "from raise"; see the notes in the reply.
    assignedAt: { type: Date },
    slaHours: { type: Number },
    slaDueAt: { type: Date },
    startedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    reopenCount: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

ticketSchema.index({ residentId: 1, createdAt: -1 });
ticketSchema.index({ assigneeId: 1, status: 1 });
ticketSchema.index({ status: 1, slaDueAt: 1 });

export type TicketDoc = InferSchemaType<typeof ticketSchema> & { _id: Types.ObjectId };
export const Ticket = model('Ticket', ticketSchema);
