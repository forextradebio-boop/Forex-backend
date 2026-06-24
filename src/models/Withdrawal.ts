import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  bankDetails: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    bankDetails: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    adminNotes: { type: String }
  },
  { timestamps: true }
);

export const WithdrawalModel = mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);
