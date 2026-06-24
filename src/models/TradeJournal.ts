import mongoose, { Schema, Document } from 'mongoose';

export interface ITradeJournal extends Document {
  userId: mongoose.Types.ObjectId;
  tradeId: mongoose.Types.ObjectId;
  aiNotes: string;
  userNotes: string;
  rating: number; // 1 to 5
  createdAt: Date;
}

const TradeJournalSchema = new Schema<ITradeJournal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tradeId: { type: Schema.Types.ObjectId, ref: 'TradeHistory', required: true },
    aiNotes: { type: String, default: '' },
    userNotes: { type: String, default: '' },
    rating: { type: Number, default: 3 },
  },
  { timestamps: true }
);

export const TradeJournalModel = mongoose.model<ITradeJournal>('TradeJournal', TradeJournalSchema);
