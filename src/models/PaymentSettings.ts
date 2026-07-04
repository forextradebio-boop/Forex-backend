import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentSettings extends Document {
  upiId?: string;
  qrCodeUrl?: string;
  bankName?: string;
  accountHolder?: string;
  bankAccount?: string;
  ifscCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSettingsSchema = new Schema<IPaymentSettings>(
  {
    upiId: { type: String, default: 'demo@upi' },
    qrCodeUrl: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
  },
  { timestamps: true }
);

export const PaymentSettingsModel = mongoose.model<IPaymentSettings>('PaymentSettings', PaymentSettingsSchema);
