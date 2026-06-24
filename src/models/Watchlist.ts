import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchlist extends Document {
  userId: mongoose.Types.ObjectId;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    symbols: [{ type: String }],
  },
  { timestamps: true }
);

export const WatchlistModel = mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
