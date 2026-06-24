import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  adminId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  action: string;
  details: any;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String }
  },
  { timestamps: true }
);

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
