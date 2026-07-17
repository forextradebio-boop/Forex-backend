import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeRate extends Document {
  currentRate: number;
  baseCurrency: string; // USD
  quoteCurrency: string; // INR
  provider: 'MANUAL' | 'LIVE';
  isActive: boolean;
  updatedBy?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    currentRate: { type: Number, required: true },
    baseCurrency: { type: String, required: true, default: 'USD' },
    quoteCurrency: { type: String, required: true, default: 'INR' },
    provider: { type: String, enum: ['MANUAL', 'LIVE'], default: 'MANUAL' },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Ensure there is only ever one active rate per currency pair. We can enforce this logic in the controller.
export const ExchangeRateModel = mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
