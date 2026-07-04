import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  condition: 'ABOVE' | 'BELOW';
  targetPrice: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'DISABLED';
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    condition: { type: String, enum: ['ABOVE', 'BELOW'], required: true },
    targetPrice: { type: Number, required: true },
    status: { type: String, enum: ['ACTIVE', 'TRIGGERED', 'DISABLED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

AlertSchema.index(
  { userId: 1, symbol: 1, condition: 1, targetPrice: 1 }, 
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

export const AlertModel = mongoose.model<IAlert>('Alert', AlertSchema);
