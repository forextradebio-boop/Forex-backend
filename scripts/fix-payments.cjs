const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/forex-factory').then(async () => {
  const result = await mongoose.connection.db.collection('paymentsettings').updateMany({}, { $set: { upiEnabled: true, bankEnabled: true } });
  console.log('Updated documents:', result.modifiedCount);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
