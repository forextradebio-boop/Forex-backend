import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionalAccount extends Document {
  companyName: string;
  type: 'CORPORATE' | 'FUND' | 'FAMILY_OFFICE';
  adminId: mongoose.Types.ObjectId;
  users: mongoose.Types.ObjectId[];
  status: 'ACTIVE' | 'INACTIVE';
}

const InstitutionalAccountSchema = new Schema<IInstitutionalAccount>(
  {
    companyName: { type: String, required: true },
    type: { type: String, enum: ['CORPORATE', 'FUND', 'FAMILY_OFFICE'], required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const InstitutionalAccountModel = mongoose.model<IInstitutionalAccount>('InstitutionalAccount', InstitutionalAccountSchema);
