import mongoose, { Schema, Document } from 'mongoose';

export interface IChallenge extends Document {
  userId: mongoose.Types.ObjectId;
  phase: number;
  status: 'IN_PROGRESS' | 'PASSED' | 'FAILED';
  initialBalance: number;
  currentBalance: number;
  maxDrawdown: number;
  profitTarget: number;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phase: { type: Number, default: 1 },
    status: { type: String, enum: ['IN_PROGRESS', 'PASSED', 'FAILED'], default: 'IN_PROGRESS' },
    initialBalance: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    maxDrawdown: { type: Number, required: true },
    profitTarget: { type: Number, required: true },
  },
  { timestamps: true }
);

export const ChallengeModel = mongoose.model<IChallenge>('Challenge', ChallengeSchema);
