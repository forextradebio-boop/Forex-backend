import mongoose, { Schema, Document } from 'mongoose';

export interface ITradeHistory extends Document {
  userId: mongoose.Types.ObjectId;
  positionId: mongoose.Types.ObjectId;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  closePrice: number;
  pnl: number;
  openTime: Date;
  closeTime: Date;
  isDeleted: boolean;
}

const TradeHistorySchema = new Schema<ITradeHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position', required: true },
    symbol: { type: String, required: true },
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    volume: { type: Number, required: true },
    openPrice: { type: Number, required: true },
    closePrice: { type: Number, required: true },
    pnl: { type: Number, required: true },
    openTime: { type: Date, required: true },
    closeTime: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const TradeHistoryModel = mongoose.model<ITradeHistory>('TradeHistory', TradeHistorySchema);
