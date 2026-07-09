import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SymbolModel } from '../models/Symbol';

dotenv.config({ path: '.env' });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/forex';

const symbolSpecs: Record<string, any> = {
  // Forex Majors
  EURUSD: { contractSize: 100000, digits: 5 },
  GBPUSD: { contractSize: 100000, digits: 5 },
  USDJPY: { contractSize: 100000, digits: 3 },
  AUDUSD: { contractSize: 100000, digits: 5 },
  USDCAD: { contractSize: 100000, digits: 5 },
  USDCHF: { contractSize: 100000, digits: 5 },
  NZDUSD: { contractSize: 100000, digits: 5 },
  // Forex Crosses
  EURJPY: { contractSize: 100000, digits: 3 },
  EURGBP: { contractSize: 100000, digits: 5 },
  GBPJPY: { contractSize: 100000, digits: 3 },
  // Metals
  XAUUSD: { contractSize: 100, digits: 2 },
  XAGUSD: { contractSize: 5000, digits: 3 },
  // Crypto
  BTCUSD: { contractSize: 1, digits: 2 },
  ETHUSD: { contractSize: 1, digits: 2 },
  // Indices
  US30: { contractSize: 10, digits: 2 },
  NAS100: { contractSize: 10, digits: 2 },
  SPX500: { contractSize: 10, digits: 2 },
};

async function seed() {
  try {
    console.log("Connecting to", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const symbols = await SymbolModel.find({});
    console.log(`Found ${symbols.length} symbols in database.`);

    for (const sym of symbols) {
      if (!sym.name) sym.name = sym.symbol;
      
      const spec = symbolSpecs[sym.symbol];
      if (spec) {
        sym.contractSize = spec.contractSize;
        sym.digits = spec.digits;
        sym.minLot = 0.01;
        sym.maxLot = 100;
        sym.lotStep = 0.01;
        await sym.save();
        console.log(`Updated ${sym.symbol} to contractSize=${spec.contractSize}, digits=${spec.digits}`);
      } else {
        // Fallback defaults if not explicitly mapped
        const isCrypto = ['BTC', 'ETH'].some(c => sym.symbol.includes(c));
        const isJPY = sym.symbol.endsWith('JPY');
        
        sym.contractSize = isCrypto ? 1 : 100000;
        sym.digits = isJPY ? 3 : (isCrypto ? 2 : 5);
        sym.minLot = 0.01;
        sym.maxLot = 100;
        sym.lotStep = 0.01;
        await sym.save();
        console.log(`Updated ${sym.symbol} with fallback defaults: contractSize=${sym.contractSize}, digits=${sym.digits}`);
      }
    }
    console.log('Done seeding symbol specs!');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    process.exit(0);
  }
}

seed();
