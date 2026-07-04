import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  brokerId: mongoose.Types.ObjectId;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'WHITE_LABEL';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  expiresAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    brokerId: { type: Schema.Types.ObjectId, ref: 'Broker', required: true },
    plan: { type: String, enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'WHITE_LABEL'], required: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const SubscriptionModel = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
