import mongoose from 'mongoose';
import { KycModel } from './src/models/Kyc';
import { UserModel } from './src/models/User';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected');
  const kycs = await KycModel.find({});
  console.log('KYCs:', kycs);
  const users = await UserModel.find({});
  console.log('Users:', users.map(u => ({ id: u._id, email: u.email, kycStatus: u.kycStatus })));
  process.exit(0);
}
run();
