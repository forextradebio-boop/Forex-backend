import mongoose, { Schema, Document } from 'mongoose';

export interface IBroker extends Document {
  name: string;
  domain: string;
  settings: any;
  branding: any;
  status: 'ACTIVE' | 'INACTIVE';
}

const BrokerSchema = new Schema<IBroker>(
  {
    name: { type: String, required: true },
    domain: { type: String, required: true, unique: true },
    settings: { type: Schema.Types.Mixed },
    branding: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const BrokerModel = mongoose.model<IBroker>('Broker', BrokerSchema);
