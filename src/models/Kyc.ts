import mongoose, { Schema, Document } from 'mongoose';

export interface IKyc extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'UNSUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  aadharNumber?: string;
  aadharDocument?: string;
  panNumber?: string;
  panDocument?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  documents: string[]; // URLs or file identifiers
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KycSchema = new Schema<IKyc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'], default: 'UNSUBMITTED' },
    aadharNumber: { type: String },
    aadharDocument: { type: String }, // Base64 string
    panNumber: { type: String },
    panDocument: { type: String }, // Base64 string
    accountHolderName: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    upiId: { type: String },
    documents: [{ type: String }],
    adminNotes: { type: String },
  },
  { timestamps: true }
);

export const KycModel = mongoose.model<IKyc>('Kyc', KycSchema);
