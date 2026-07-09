import mongoose, { Schema, Document } from 'mongoose';

export interface ISymbol extends Document {
  symbol: string;
  name: string;
  category: string;
  price: number;
  leverageLimit: number;
  spread: number;
  contractSize: number;
  digits: number;
  tickSize?: number;
  tickValue?: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SymbolSchema = new Schema<ISymbol>(
  {
    symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    category: { type: String, required: true, default: 'FOREX' },
    price: { type: Number, required: true, default: 0 },
    leverageLimit: { type: Number, required: true, default: 500 },
    spread: { type: Number, required: true, default: 1 },
    contractSize: { type: Number, required: true, default: 100000 },
    digits: { type: Number, required: true, default: 5 },
    tickSize: { type: Number },
    tickValue: { type: Number },
    minLot: { type: Number, required: true, default: 0.01 },
    maxLot: { type: Number, required: true, default: 100 },
    lotStep: { type: Number, required: true, default: 0.01 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SymbolModel = mongoose.model<ISymbol>('Symbol', SymbolSchema);
