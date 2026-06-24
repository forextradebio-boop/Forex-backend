import mongoose, { Schema, Document } from 'mongoose';

export interface IPammAccount extends Document {
  managerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  totalEquity: number;
  performanceFee: number;
  investors: Array<{
    userId: mongoose.Types.ObjectId;
    investment: number;
    sharePercent: number;
  }>;
  status: 'ACTIVE' | 'CLOSED';
}

const PammAccountSchema = new Schema<IPammAccount>(
  {
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    totalEquity: { type: Number, default: 0 },
    performanceFee: { type: Number, default: 20 },
    investors: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        investment: { type: Number, default: 0 },
        sharePercent: { type: Number, default: 0 },
      }
    ],
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const PammAccountModel = mongoose.model<IPammAccount>('PammAccount', PammAccountSchema);
