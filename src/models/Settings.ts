import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
  },
  { timestamps: true }
);

export const SettingsModel = mongoose.model<ISettings>('Settings', SettingsSchema);
