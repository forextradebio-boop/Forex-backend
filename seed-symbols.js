import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SymbolSchema = new mongoose.Schema({
  symbol: String,
  isActive: Boolean,
});
const SymbolModel = mongoose.model('Symbol', SymbolSchema);

const defaultSymbols = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
  'EURJPY', 'EURGBP', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'USOIL'
];

async function seedSymbols() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");
  
  for (const sym of defaultSymbols) {
    await SymbolModel.findOneAndUpdate(
      { symbol: sym },
      { symbol: sym, isActive: true },
      { upsert: true, new: true }
    );
  }
  
  console.log("Symbols seeded successfully!");
  process.exit(0);
}

seedSymbols();
