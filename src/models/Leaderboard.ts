import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboard extends Document {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
  userId: mongoose.Types.ObjectId;
  rank: number;
  roi: number;
  pnl: number;
  winRate: number;
  updatedAt: Date;
}

const LeaderboardSchema = new Schema<ILeaderboard>(
  {
    period: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rank: { type: Number, required: true },
    roi: { type: Number, required: true },
    pnl: { type: Number, required: true },
    winRate: { type: Number, required: true },
  },
  { timestamps: true }
);

LeaderboardSchema.index({ period: 1, rank: 1 });

export const LeaderboardModel = mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);
