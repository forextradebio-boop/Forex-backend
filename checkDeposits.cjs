const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const db = mongoose.connection.useDb('test'); // default or parse from URI
    const deposits = await mongoose.connection.collection('deposits').find({}).sort({createdAt: -1}).limit(5).toArray();
    console.log("Recent deposits:", JSON.stringify(deposits, null, 2));
    mongoose.disconnect();
});
