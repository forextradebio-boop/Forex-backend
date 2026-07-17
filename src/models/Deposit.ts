import mongoose, { Schema, Document } from 'mongoose';

export interface IDeposit extends Document {
  userId: mongoose.Types.ObjectId | string;
  amount: number;
  currency: string;
  paymentMethod: 'UPI' | 'NETBANKING';
  utr: string;
  screenshot?: string; // URL or path
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  adminNote?: string;
  remarks?: string;
  exchangeRate?: number;
  creditedUSD?: number;
  approvedBy?: mongoose.Types.ObjectId | string;
  approvedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isArchived: boolean;
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
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'], default: 'PENDING' },
    adminNote: { type: String },
    remarks: { type: String },
    exchangeRate: { type: Number },
    creditedUSD: { type: Number },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const DepositModel = mongoose.model<IDeposit>('Deposit', DepositSchema);
