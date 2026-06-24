import mongoose from 'mongoose';
import { config } from './env';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      // useNewUrlParser and useUnifiedTopology are default in Mongoose 6+
    });
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
  });

  // Graceful shutdown
  const gracefulExit = async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  };
  process.on('SIGINT', gracefulExit);
  process.on('SIGTERM', gracefulExit);
};
