import mongoose, { Schema, Document } from 'mongoose';

export interface ISocialPost extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  tradeId?: mongoose.Types.ObjectId; // Linked trade
  likes: mongoose.Types.ObjectId[];
  comments: Array<{
    userId: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
  }>;
  createdAt: Date;
}

const SocialPostSchema = new Schema<ISocialPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    tradeId: { type: Schema.Types.ObjectId, ref: 'TradeHistory' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: true }
);

export const SocialPostModel = mongoose.model<ISocialPost>('SocialPost', SocialPostSchema);
