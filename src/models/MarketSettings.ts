import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketSettings extends Document {
  status: 'OPEN' | 'CLOSED';
  trend: 'BULLISH' | 'BEARISH' | 'NORMAL';
  spread: number;
  volatility: number;
  
  // Platform Controls
  globalTradingStatus: 'ON' | 'OFF';
  globalGraphStatus: 'LIVE' | 'PAUSED';
  globalMarketStatus: 'OPEN' | 'CLOSED' | 'MAINTENANCE' | 'HOLIDAY';
  lastUpdatedBy?: mongoose.Types.ObjectId;
  reason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MarketSettingsSchema = new Schema<IMarketSettings>(
  {
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    trend: { type: String, enum: ['BULLISH', 'BEARISH', 'NORMAL'], default: 'NORMAL' },
    spread: { type: Number, default: 0.1 },
    volatility: { type: Number, default: 10 },
    
    // Platform Controls
    globalTradingStatus: { type: String, enum: ['ON', 'OFF'], default: 'ON' },
    globalGraphStatus: { type: String, enum: ['LIVE', 'PAUSED'], default: 'LIVE' },
    globalMarketStatus: { type: String, enum: ['OPEN', 'CLOSED', 'MAINTENANCE', 'HOLIDAY'], default: 'OPEN' },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
  },
  { timestamps: true }
);

export const MarketSettingsModel = mongoose.model<IMarketSettings>('MarketSettings', MarketSettingsSchema);
