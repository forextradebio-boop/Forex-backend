import mongoose, { Schema, Document } from 'mongoose';

export interface IPosition extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  sl?: number;
  tp?: number;
  pnl: number;
  commission: number;
  swap: number;
  marginUsed: number;
  status: 'OPEN' | 'CLOSED';
  closePrice?: number;
  deletedAt?: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PositionSchema = new Schema<IPosition>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    volume: { type: Number, required: true },
    openPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    sl: { type: Number },
    tp: { type: Number },
    pnl: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    swap: { type: Number, default: 0 },
    marginUsed: { type: Number, default: 0 },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    closePrice: { type: Number },
    deletedAt: { type: Date },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const PositionModel = mongoose.model<IPosition>('Position', PositionSchema);
