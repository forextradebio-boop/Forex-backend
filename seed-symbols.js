import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SymbolSchema = new mongoose.Schema({
  symbol: String,
  name: String,
  category: String,
  price: Number,
  leverageLimit: Number,
  spread: Number,
  contractSize: Number,
  digits: Number,
  minLot: Number,
  maxLot: Number,
  lotStep: Number,
  status: String,
  visibleToUsers: Boolean,
  tradingEnabled: Boolean,
  isActive: Boolean,
});
const SymbolModel = mongoose.model('Symbol', SymbolSchema);

const defaultSymbols = [
  { symbol: 'EURUSD', name: 'Euro vs US Dollar', category: 'FOREX' },
  { symbol: 'GBPUSD', name: 'British Pound vs US Dollar', category: 'FOREX' },
  { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen', category: 'FOREX' },
  { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar', category: 'FOREX' },
  { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar', category: 'FOREX' },
  { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc', category: 'FOREX' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar', category: 'FOREX' },
  { symbol: 'EURJPY', name: 'Euro vs Japanese Yen', category: 'FOREX' },
  { symbol: 'EURGBP', name: 'Euro vs British Pound', category: 'FOREX' },
  { symbol: 'GBPJPY', name: 'British Pound vs Japanese Yen', category: 'FOREX' },
  { symbol: 'XAUUSD', name: 'Gold vs US Dollar', category: 'COMMODITIES' },
  { symbol: 'XAGUSD', name: 'Silver vs US Dollar', category: 'COMMODITIES' },
  { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar', category: 'CRYPTO' },
  { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar', category: 'CRYPTO' },
  { symbol: 'USOIL',  name: 'US Crude Oil', category: 'COMMODITIES' },
];

async function seedSymbols() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");
  
  for (const sym of defaultSymbols) {
    await SymbolModel.findOneAndUpdate(
      { symbol: sym.symbol },
      { 
        symbol: sym.symbol,
        name: sym.name,
        category: sym.category,
        status: 'OPEN',
        tradingEnabled: true,
        visibleToUsers: true,
      },
      { upsert: true, new: true }
    );
    console.log(`  ✓ ${sym.symbol} — ${sym.name}`);
  }
  
  console.log("\nSymbols seeded successfully!");
  process.exit(0);
}

seedSymbols();
