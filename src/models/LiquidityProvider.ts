import mongoose, { Schema, Document } from 'mongoose';

export interface ILiquidityProvider extends Document {
  name: string;
  apiUrl: string;
  apiKey: string;
  priority: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const LiquidityProviderSchema = new Schema<ILiquidityProvider>(
  {
    name: { type: String, required: true },
    apiUrl: { type: String, required: true },
    apiKey: { type: String, required: true },
    priority: { type: Number, default: 1 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const LiquidityProviderModel = mongoose.model<ILiquidityProvider>('LiquidityProvider', LiquidityProviderSchema);
