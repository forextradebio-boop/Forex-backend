import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultJwtSecret = nodeEnv === 'production' ? '' : 'dev-jwt-secret-change-me';
const defaultRefreshSecret = nodeEnv === 'production' ? '' : 'dev-refresh-secret-change-me';

console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET ? 'YES' : 'NO');
console.log('JWT_REFRESH_SECRET loaded:', !!process.env.JWT_REFRESH_SECRET ? 'YES' : 'NO');
console.log('PORT value:', process.env.PORT);

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing from .env');
}

if (nodeEnv === 'production' && !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET is missing from .env');
}

export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/forex-factory',
  jwtSecret: process.env.JWT_SECRET || defaultJwtSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || defaultRefreshSecret,
  port: process.env.PORT || '8000',
  nodeEnv,
};
