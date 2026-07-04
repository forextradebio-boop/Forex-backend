import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { WalletModel } from '../models/Wallet';
import { KycModel } from '../models/Kyc';
import { SettingsModel } from '../models/Settings';
import { signAccessToken, signRefreshToken } from '../utils/jwt';

// Register a new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    console.log(`[REGISTER] Request body:`, req.body);

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (typeof username !== 'string' || username.length < 4) {
      return res.status(400).json({ error: 'Username must be at least 4 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await UserModel.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
      username: username.toLowerCase(),
      passwordHash: hashed,
      role: 'user',
      kycStatus: 'PENDING',
    });

    // create default wallet
    await WalletModel.create({
      userId: user._id,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      pnl: 0,
    });

    // create default settings
    await SettingsModel.create({
      userId: user._id,
      theme: 'light',
      notifications: true,
      language: 'en',
    });

    // create KYC placeholder (status pending)
    await KycModel.create({
      userId: user._id,
      status: 'PENDING',
      documents: [],
    });

    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const profile: any = user.toObject();
    delete profile.password;
    delete profile.passwordHash;
    profile.id = profile._id;

    res.status(201).json({ success: true, message: 'Registered successfully', token, refreshToken, profile });
  } catch (err) {
    next(err);
  }
};

// Login existing user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password: passwordInput } = req.body;
    if (!username || !passwordInput) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const query = {
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
    };
    const user = await UserModel.findOne(query);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hash = user.passwordHash || user.password || '';
    const match = await bcrypt.compare(passwordInput, hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const profile: any = user.toObject();
    delete profile.password;
    delete profile.passwordHash;
    profile.id = profile._id;
    res.json({ success: true, token, refreshToken, profile });
  } catch (err) {
    next(err);
  }
};

// Get profile of authenticated user
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore added by middleware
    const userId = (req as any).user.id;
    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profile: any = user.toObject();
    const { password: _password, ...safeProfile } = profile;
    safeProfile.id = safeProfile._id;
    res.json({ success: true, profile: safeProfile });
  } catch (err) {
    next(err);
  }
};

// --- Deprecated Endpoints (OTP removed) ---
export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(400).json({ error: 'This endpoint is deprecated - use /login instead' });
  } catch (err) {
    next(err);
  }
};

export const resendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(400).json({ error: 'This endpoint is deprecated - OTP removed' });
  } catch (err) {
    next(err);
  }
};

export const forgotPasswordStart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(400).json({ error: 'This endpoint is deprecated' });
  } catch (err) {
    next(err);
  }
};

export const forgotPasswordGenerateOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(400).json({ error: 'This endpoint is deprecated - OTP removed' });
  } catch (err) {
    next(err);
  }
};

export const forgotPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(400).json({ error: 'This endpoint is deprecated' });
  } catch (err) {
    next(err);
  }
};