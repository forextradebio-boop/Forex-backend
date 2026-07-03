import mongoose, { Schema, Document } from 'mongoose';

export interface IDeposit extends Document {
  userId: mongoose.Types.ObjectId | string;
  amount: number;
  currency: string;
  paymentMethod: 'UPI' | 'NETBANKING';
  utr: string;
  screenshot?: string; // URL or path
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepositSchema = new Schema<IDeposit>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    paymentMethod: { type: String, enum: ['UPI', 'NETBANKING'], required: true, default: 'UPI' },
    utr: { type: String, required: true },
    screenshot: { type: String },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    adminNote: { type: String },
  },
  { timestamps: true },
);

export const DepositModel = mongoose.model<IDeposit>('Deposit', DepositSchema);
