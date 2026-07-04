import mongoose, { Schema, Document } from 'mongoose';

export interface IMamAccount extends Document {
  masterId: mongoose.Types.ObjectId;
  name: string;
  allocationMethod: 'EQUITY' | 'LOT_MULTIPLIER' | 'EQUAL';
  childAccounts: Array<{
    userId: mongoose.Types.ObjectId;
    multiplier: number;
  }>;
  status: 'ACTIVE' | 'CLOSED';
}

const MamAccountSchema = new Schema<IMamAccount>(
  {
    masterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    allocationMethod: { type: String, enum: ['EQUITY', 'LOT_MULTIPLIER', 'EQUAL'], default: 'EQUITY' },
    childAccounts: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        multiplier: { type: Number, default: 1 },
      }
    ],
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const MamAccountModel = mongoose.model<IMamAccount>('MamAccount', MamAccountSchema);
