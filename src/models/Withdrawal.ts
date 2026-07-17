import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  bankDetails: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  exchangeRate?: number;
  receivedINR?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'INR', 'EUR'], default: 'USD' },
    bankDetails: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    adminNotes: { type: String },
    exchangeRate: { type: Number },
    receivedINR: { type: Number },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const WithdrawalModel = mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);
