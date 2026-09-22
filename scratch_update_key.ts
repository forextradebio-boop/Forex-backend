const mongoose = require('mongoose');

mongoose.connect('mongodb://forextradebio_db_user:ForexTradebio_db_user@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0')
.then(async () => { 
  const ApiKey = mongoose.model('ApiKey', new mongoose.Schema({}, {strict: false}), 'apikeys'); 
  await ApiKey.updateOne({ provider: 'YAHOO' }, { $set: { status: 'ACTIVE' } }); 
  await ApiKey.updateOne({ provider: 'TWELVEDATA', keyValue: 'f0fa488f2f5b45968826c6394c09e3d3' }, { $set: { status: 'ACTIVE' } }); 
  console.log('Keys Activated'); 
  process.exit(0); 
});
