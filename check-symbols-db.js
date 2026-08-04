import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SymbolSchema = new mongoose.Schema({}, { strict: false });
const SymbolModel = mongoose.model('Symbol', SymbolSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const symbols = await SymbolModel.find().lean();
  console.log(JSON.stringify(symbols.map(s => ({ symbol: s.symbol, visible: s.visibleToUsers })), null, 2));
  process.exit(0);
}
check();
