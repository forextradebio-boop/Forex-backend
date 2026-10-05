const mongoose = require('mongoose');
mongoose.connect('mongodb://forextradebio_db_user:ForexTradebio_db_user@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0')
.then(async () => {
    await mongoose.connection.collection('symbols').updateOne({ symbol: 'USOIL' }, { $set: { category: 'CRUDE OIL' } });
    console.log('Updated');
    process.exit(0);
}).catch(e => console.error(e));
