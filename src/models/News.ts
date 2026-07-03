import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
  title: string;
  summary: string;
  content: string;
  category: string;
  source: string;
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema = new Schema<INews>(
  {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true, default: 'global' },
    source: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const NewsModel = mongoose.model<INews>('News', NewsSchema);
