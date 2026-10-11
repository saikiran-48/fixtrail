import { model, Schema, Types, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Email is the identity: one email, one account, one role.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['resident', 'staff', 'manager'], required: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = model('User', userSchema);
