import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { WalletModel } from './models/Wallet';
import { PositionModel } from './models/Position';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex');
  const wallets = await WalletModel.find();
  for (const w of wallets) {
    const openPos = await PositionModel.countDocuments({ userId: w.userId, status: 'OPEN' });
    if (openPos === 0) {
      w.margin = 0;
      w.equity = w.balance;
      w.freeMargin = w.balance;
      await w.save();
      console.log('Fixed wallet for user', w.userId);
    }
  }
  process.exit(0);
};

run();
