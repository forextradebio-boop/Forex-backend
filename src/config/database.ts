import mongoose from 'mongoose';
import { config } from './env';

let mongoServer: any = null;

export const connectDatabase = async () => {
  try {
    if (config.nodeEnv !== 'production' && config.mongoUri.includes('127.0.0.1:27017')) {
      // Dynamically import only in dev/test environments
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('MongoDB Connected Successfully (in-memory)');
    } else {
      await mongoose.connect(config.mongoUri, {
        // useNewUrlParser and useUnifiedTopology are default in Mongoose 6+
      });
      console.log('MongoDB Connected Successfully');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
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
