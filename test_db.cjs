require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
    const uri = process.env.MONGO_URI || "mongodb://forextradebio_db_user:ForexTradebio_db_user@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const marketSettings = await mongoose.connection.collection('marketsettings').findOne({});
    console.log(marketSettings);
    
    // Also check Symbol "EURUSD"
    const symbol = await mongoose.connection.collection('symbols').findOne({symbol: "EURUSD"});
    console.log(symbol);

    process.exit(0);
}
test();
