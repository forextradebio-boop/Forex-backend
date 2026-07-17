import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentSettings extends Document {
  upiEnabled: boolean;
  bankEnabled: boolean;
  merchantName?: string;
  upiId?: string;
  qrImage?: string; // Replaces qrCodeUrl conceptually, but keeping old for safety
  qrCodeUrl?: string; 
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  bankAccount?: string; // Keep old for backward compatibility
  ifsc?: string;
  ifscCode?: string; // Keep old for backward compatibility
  branch?: string;
  accountType?: string;
  instructions?: string;
  updatedBy?: string | mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSettingsSchema = new Schema<IPaymentSettings>(
  {
    upiEnabled: { type: Boolean, default: false },
    bankEnabled: { type: Boolean, default: false },
    merchantName: { type: String, default: '' },
    upiId: { type: String, default: 'demo@upi' },
    qrImage: { type: String, default: '' },
    qrCodeUrl: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    branch: { type: String, default: '' },
    accountType: { type: String, default: '' },
    instructions: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const PaymentSettingsModel = mongoose.model<IPaymentSettings>('PaymentSettings', PaymentSettingsSchema);
