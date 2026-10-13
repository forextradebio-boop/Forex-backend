import mongoose from 'mongoose';
import { config } from './env';

let mongoServer: any = null;

export const connectDatabase = async () => {
  try {
    if (config.nodeEnv !== 'production' && config.mongoUri.includes('127.0.0.1:27017')) {
      // Dynamically import only in dev/test environments
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      // Increase the startup timeout for the in-memory server
      process.env.MONGOMS_SERVER_STARTUP_TIMEOUT = '60000';
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB Connected Successfully (in-memory)');
    } else {
      if ((config.mongoUri.includes('127.0.0.1') || config.mongoUri.includes('localhost')) && config.nodeEnv === 'production') {
        console.warn('⚠️ WARNING: Using localhost/127.0.0.1 MongoDB URI in production! In Render or cloud hosting, you must set MONGODB_URI in the Environment variables to a MongoDB Atlas cluster URL.');
      }
      await mongoose.connect(config.mongoUri, {
        dbName: 'forextradebio',
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB Connected Successfully to forextradebio database');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (config.mongoUri.includes('127.0.0.1') || config.mongoUri.includes('localhost')) {
      console.error('\n❌ Cloud deployment failed because MONGODB_URI is pointing to localhost (127.0.0.1:27017).');
      console.error('👉 Fix: Go to your Render Dashboard -> Forex-backend -> Environment, and add MONGODB_URI with your MongoDB Atlas connection string.');
    }
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
  });

  const gracefulExit = async () => {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  };

  process.on('SIGINT', gracefulExit);
  process.on('SIGTERM', gracefulExit);
};
