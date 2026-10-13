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

const defaultAtlasUri = 'mongodb://forextradebio_db_user:ForexTradebio_db_user@ac-zo3ciit-shard-00-00.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-01.3w3sdqj.mongodb.net:27017,ac-zo3ciit-shard-00-02.3w3sdqj.mongodb.net:27017/forextradebio?ssl=true&replicaSet=atlas-cty2mf-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI;
  if (uri && !uri.includes('127.0.0.1') && !uri.includes('localhost')) {
    return uri;
  }
  if (nodeEnv === 'production') {
    return defaultAtlasUri;
  }
  return uri || 'mongodb://127.0.0.1:27017/forex-factory';
};

export const config = {
  mongoUri: getMongoUri(),
  jwtSecret: process.env.JWT_SECRET || defaultJwtSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || defaultRefreshSecret,
  port: process.env.PORT || '8000',
  nodeEnv,
};
