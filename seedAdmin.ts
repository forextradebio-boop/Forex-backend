import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from './src/models/User';
import { WalletModel } from './src/models/Wallet';
import { KycModel } from './src/models/Kyc';
import { SettingsModel } from './src/models/Settings';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/forex-factory';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await UserModel.findOne({ username: 'admin@trading.com' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Admin@1234', 12);

    const adminUser = await UserModel.create({
      username: 'admin@trading.com',
      fullName: 'Admin User',
      email: 'admin@trading.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      kycStatus: 'APPROVED'
    });

    await WalletModel.create({
      userId: adminUser._id,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      pnl: 0,
    });

    await KycModel.create({
      userId: adminUser._id,
      status: 'APPROVED',
      documents: [],
    });

    await SettingsModel.create({
      userId: adminUser._id,
      theme: 'light',
      notifications: true,
      language: 'en',
    });

    console.log('Admin user created: admin@trading.com with password Admin@1234');
    process.exit(0);
  } catch (error) {
    console.error('Seed admin failed:', error);
    process.exit(1);
  }
}

seedAdmin();