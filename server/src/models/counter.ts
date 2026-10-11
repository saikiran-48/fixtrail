import { model, Schema } from 'mongoose';

// Atomic sequence numbers for ticket references (FT-0001, FT-0002, ...).
const counterSchema = new Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, required: true, default: 0 },
});

export const Counter = model('Counter', counterSchema);

export async function nextTicketRef(): Promise<string> {
  const c = await Counter.findOneAndUpdate(
    { name: 'ticket' },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return `FT-${String(c.value).padStart(4, '0')}`;
}
