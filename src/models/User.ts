import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  avatar?: string;
  password: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
  kycStatus: 'UNSUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  otpCode?: string;
  otpExpiresAt?: Date;
  isOtpVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    country: { type: String },
    avatar: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    status: { type: String, enum: ['ACTIVE', 'BANNED', 'SUSPENDED'], default: 'ACTIVE' },
    kycStatus: {
      type: String,
      enum: ['UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'UNSUBMITTED',
    },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    isOtpVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
