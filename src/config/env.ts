import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the correct .env file relative to the backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET ? "YES" : "NO");
console.log("JWT_REFRESH_SECRET loaded:", !!process.env.JWT_REFRESH_SECRET ? "YES" : "NO");
console.log("PORT value:", process.env.PORT);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is missing from .env");
}

export const config = {
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  port: process.env.PORT || "8000",
  nodeEnv: process.env.NODE_ENV || 'development',
};
