import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId | string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  pnl: number;
  status: 'ACTIVE' | 'FROZEN';
  usedMargin?: number;
  marginLevel?: number;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    balance: { type: Number, default: 0 },
    equity: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    freeMargin: { type: Number, default: 0 },
    pnl: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'FROZEN'], default: 'ACTIVE' },
    usedMargin: { type: Number, default: 0 },
    marginLevel: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

WalletSchema.pre('save', async function () {
  this.balance = Math.max(0, roundToTwo(this.balance));
  this.equity = Math.max(0, roundToTwo(this.equity));
  this.margin = Math.max(0, roundToTwo(this.margin));
  this.pnl = this.pnl;

  // Calculate freeMargin and clamp to 0
  this.freeMargin = Math.max(0, roundToTwo(this.equity - this.margin));
});

WalletSchema.pre('findOneAndUpdate', async function () {
  const update: any = this.getUpdate();
  if (update && update.$set) {
    if (update.$set.balance !== undefined) update.$set.balance = Math.max(0, roundToTwo(update.$set.balance));
    if (update.$set.equity !== undefined) update.$set.equity = Math.max(0, roundToTwo(update.$set.equity));
    if (update.$set.margin !== undefined) update.$set.margin = Math.max(0, roundToTwo(update.$set.margin));
    if (update.$set.pnl !== undefined) update.$set.pnl = update.$set.pnl;

    // If equity or margin is updated, recalculate free margin
    if (update.$set.equity !== undefined || update.$set.margin !== undefined) {
      // Note: To recalculate freeMargin accurately, we'd need the current doc values.
      // Here we simply ensure rounding; actual freeMargin should be handled in save hook.
    }

    if (update.$set.freeMargin !== undefined) {
       update.$set.freeMargin = Math.max(0, roundToTwo(update.$set.freeMargin));
    }
  }
});

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);
