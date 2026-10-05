import mongoose, { Schema, Document } from 'mongoose';

export interface IProviderSettings extends Document {
  symbol: string;
  provider: string;
  enabled: boolean;
  lastSuccessfulFetch: Date | null;
  lastSuccessfulPrice: number | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSettingsSchema = new Schema<IProviderSettings>(
  {
    symbol: { type: String, required: true },
    provider: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    lastSuccessfulFetch: { type: Date, default: null },
    lastSuccessfulPrice: { type: Number, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness for symbol + provider
ProviderSettingsSchema.index({ symbol: 1, provider: 1 }, { unique: true });

export const ProviderSettingsModel = mongoose.model<IProviderSettings>('ProviderSettings', ProviderSettingsSchema);
