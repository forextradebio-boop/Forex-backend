import mongoose from 'mongoose';
import { ApiKeyModel } from './src/models/ApiKey';

async function run() {
  await mongoose.connect('mongodb://forextradebio_db_user:ForexTradebio_db_user@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
  
  // Remove existing OILPRICEAPI keys
  await ApiKeyModel.deleteMany({ provider: 'OILPRICEAPI' });
  
  // Add new key
  await ApiKeyModel.create({
    provider: 'OILPRICEAPI',
    keyName: 'Main Account',
    keyValue: '8d42d0c711f7b75534e2683f1b36b888283e11b1e5e1eceb186451d28ba42b7d',
    status: 'ACTIVE'
  });
  
  console.log('Key added to DB');
  process.exit(0);
}

run();
