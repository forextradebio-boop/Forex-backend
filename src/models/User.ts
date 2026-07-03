import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  fullName?: string;
  email?: string;
  phone?: string;
  country?: string;
  avatar?: string;
  password?: string; // legacy, kept for backward compatibility
  passwordHash?: string; // preferred field
  role: string;
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED' | 'DISABLED' | 'TRADING_BLOCKED';
  kycStatus: 'UNSUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, minlength: 4 },
    fullName: { type: String },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String },
    country: { type: String },
    avatar: { type: String },
    // Keep legacy `password` for older code, but prefer `passwordHash`
    password: { type: String },
    passwordHash: { type: String },
    role: { type: String, default: 'user' },
    status: { type: String, enum: ['ACTIVE', 'BANNED', 'SUSPENDED', 'DISABLED', 'TRADING_BLOCKED'], default: 'ACTIVE' },
    kycStatus: {
      type: String,
      enum: ['UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true },
);

// Ensure when reading out user objects we don't expose password fields
UserSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.password;
    delete ret.passwordHash;
    return ret;
  },
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
