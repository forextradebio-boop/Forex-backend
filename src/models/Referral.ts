import mongoose, { Schema, Document } from 'mongoose';

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredId: mongoose.Types.ObjectId;
  codeUsed: string;
  totalEarnings: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referredId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    codeUsed: { type: String, required: true },
    totalEarnings: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const ReferralModel = mongoose.model<IReferral>('Referral', ReferralSchema);
