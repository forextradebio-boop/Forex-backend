const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://forextradebio_db_user:ForexAdmin982917@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const SymbolModel = mongoose.connection.collection('symbols');
  const symbols = await SymbolModel.find({ 
    $or: [
      { tradingEnabled: false },
      { status: 'CLOSED' },
      { isActive: false }
    ]
  }).toArray();
  
  console.log('Disabled symbols:', symbols.map(s => s.symbol));

  if (symbols.length > 0) {
    await SymbolModel.updateMany(
      {},
      { $set: { status: 'OPEN', tradingEnabled: true, isActive: true } }
    );
    console.log(`Enabled ${symbols.length} symbols successfully.`);
  }

  process.exit(0);
}

main().catch(console.error);
