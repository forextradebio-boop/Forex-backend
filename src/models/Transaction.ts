import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId | string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRADE' | 'BONUS' | 'TRADE_LOSS' | 'ADMIN_ADJUSTMENT';
  amount: number;
  balanceAfter?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  referenceId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, enum: ['DEPOSIT', 'WITHDRAW', 'TRADE', 'BONUS', 'TRADE_LOSS', 'ADMIN_ADJUSTMENT'], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    referenceId: { type: String },
    description: { type: String },
  },
  { timestamps: true }
);

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
