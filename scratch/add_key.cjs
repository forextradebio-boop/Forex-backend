const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://forextradebio_db_user:ForexTradebio_db_user@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
  
  const schema = new mongoose.Schema({
    provider: String,
    keyName: String,
    keyValue: String,
    status: String,
    errorCount: Number,
  }, { timestamps: true });

  const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', schema);

  await ApiKey.create({
    provider: 'VANTAGE',
    keyName: 'User Provided Key',
    keyValue: '8KV6NS5JP0WX2HLZ',
    status: 'ACTIVE',
    errorCount: 0
  });

  console.log('Successfully added VANTAGE API Key');
  process.exit(0);
}

run().catch(console.error);
