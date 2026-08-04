import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SymbolSchema = new mongoose.Schema({}, { strict: false });
const SymbolModel = mongoose.model('Symbol', SymbolSchema);

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  await SymbolModel.updateOne({ symbol: 'XAUUSD' }, { $set: { visibleToUsers: true } });
  console.log("Fixed XAUUSD visibility");
  process.exit(0);
}
fix();
