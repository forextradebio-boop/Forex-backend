import mongoose, { Schema, Document } from 'mongoose';

export interface ICopyTrader extends Document {
  providerId: mongoose.Types.ObjectId;
  followerId: mongoose.Types.ObjectId;
  allocationRatio: number;
  profitSharePercent: number;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  createdAt: Date;
}

const CopyTraderSchema = new Schema<ICopyTrader>(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    allocationRatio: { type: Number, default: 1 },
    profitSharePercent: { type: Number, default: 20 },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'STOPPED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const CopyTraderModel = mongoose.model<ICopyTrader>('CopyTrader', CopyTraderSchema);
