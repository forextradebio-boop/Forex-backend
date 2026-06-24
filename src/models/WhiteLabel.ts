import mongoose, { Schema, Document } from 'mongoose';

export interface IWhiteLabel extends Document {
  ownerId: mongoose.Types.ObjectId;
  companyName: string;
  domain: string;
  logoUrl: string;
  themeConfig: any;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
}

const WhiteLabelSchema = new Schema<IWhiteLabel>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true },
    domain: { type: String, required: true, unique: true },
    logoUrl: { type: String },
    themeConfig: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING' },
  },
  { timestamps: true }
);

export const WhiteLabelModel = mongoose.model<IWhiteLabel>('WhiteLabel', WhiteLabelSchema);
