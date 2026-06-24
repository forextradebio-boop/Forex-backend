import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  documentType: 'KYC_ID' | 'KYC_ADDRESS' | 'AGREEMENT' | 'REPORT';
  filePath: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: { type: String, required: true },
    filePath: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
