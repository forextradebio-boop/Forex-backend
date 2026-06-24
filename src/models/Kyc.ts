import mongoose, { Schema, Document } from 'mongoose';

export interface IKyc extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'UNSUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  documentType?: string;
  documentNumber?: string;
  fullName?: string;
  dob?: string;
  documents: string[]; // URLs or file identifiers
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KycSchema = new Schema<IKyc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'], default: 'UNSUBMITTED' },
    documentType: { type: String },
    documentNumber: { type: String },
    fullName: { type: String },
    dob: { type: String },
    documents: [{ type: String }],
    adminNotes: { type: String },
  },
  { timestamps: true }
);

export const KycModel = mongoose.model<IKyc>('Kyc', KycSchema);
