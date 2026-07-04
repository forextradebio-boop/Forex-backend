import mongoose, { Schema, Document } from 'mongoose';

export interface IIntroducingBroker extends Document {
  userId: mongoose.Types.ObjectId;
  commissionLevel: number;
  revenueSharePercent: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  totalCommission: number;
  createdAt: Date;
}

const IntroducingBrokerSchema = new Schema<IIntroducingBroker>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    commissionLevel: { type: Number, default: 1 },
    revenueSharePercent: { type: Number, default: 10 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    totalCommission: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const IntroducingBrokerModel = mongoose.model<IIntroducingBroker>('IntroducingBroker', IntroducingBrokerSchema);
