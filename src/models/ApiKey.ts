import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  provider: string;
  keyName: string;
  keyValue: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED';
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    provider: {
      type: String,
      required: true,
      uppercase: true, // Auto-capitalize custom providers
      default: 'TWELVEDATA'
    },
    keyName: {
      type: String,
      required: true,
    },
    keyValue: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'EXHAUSTED'],
      default: 'ACTIVE',
    },
    errorCount: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

export const ApiKeyModel = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
