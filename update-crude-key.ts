import mongoose from 'mongoose';
import { ApiKeyModel } from './src/models/ApiKey';

async function run() {
  await mongoose.connect('mongodb://forextradebio_db_user:ForexTradebio_db_user@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
  
  // Update OILPRICEAPI key
  await ApiKeyModel.deleteMany({ provider: 'OILPRICEAPI' });
  
  await ApiKeyModel.create({
    provider: 'OILPRICEAPI',
    keyName: 'Main Crude Key',
    keyValue: 'deMsggvzfZosGFrJyouAM1vBYP6L6e07ykDUV6zD',
    status: 'ACTIVE'
  });
  
  console.log('Crude Oil API Key replaced successfully.');
  process.exit(0);
}

run();
