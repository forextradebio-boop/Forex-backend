import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export const signAccessToken = (payload: object, expiresIn = '15m') => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
};

export const signRefreshToken = (payload: object, expiresIn = '7d') => {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn });
};

export const verifyToken = (token: string, isRefresh = false) => {
  const secret = isRefresh ? config.jwtRefreshSecret : config.jwtSecret;
  return jwt.verify(token, secret);
};
