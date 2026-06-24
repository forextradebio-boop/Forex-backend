import mongoose, { Schema, Document } from 'mongoose';

export interface ILicense extends Document {
  type: 'BROKER' | 'WHITE_LABEL' | 'FEATURE';
  key: string;
  ownerId: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'REVOKED';
}

const LicenseSchema = new Schema<ILicense>(
  {
    type: { type: String, enum: ['BROKER', 'WHITE_LABEL', 'FEATURE'], required: true },
    key: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const LicenseModel = mongoose.model<ILicense>('License', LicenseSchema);
