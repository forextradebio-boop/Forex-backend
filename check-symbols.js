import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SymbolSchema = new mongoose.Schema({
  symbol: String,
  isActive: Boolean,
});
const SymbolModel = mongoose.model('Symbol', SymbolSchema);

async function checkSymbols() {
  await mongoose.connect(process.env.MONGODB_URI);
  const symbols = await SymbolModel.find();
  console.log("Symbols in DB:");
  symbols.forEach(s => console.log(s.symbol, s.isActive));
  process.exit(0);
}

checkSymbols();
