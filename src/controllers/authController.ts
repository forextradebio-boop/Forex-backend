import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { WalletModel } from '../models/Wallet';
import { signAccessToken, signRefreshToken } from '../utils/jwt';

// Register a new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, password, phone } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const otpCode = "123456";
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    const user = await UserModel.create({
      fullName,
      email: email.toLowerCase(),
      phone: phone || '',
      password: hashed,
      otpCode,
      otpExpiresAt,
      isOtpVerified: false,
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
    // TODO: Replace demo OTP with SMS OTP provider (MSG91/Twilio/Fast2SMS)
    res.status(201).json({
      success: true,
      userId: user._id,
      otpRequired: true,
      demoOtp: otpCode
    });
  } catch (err) {
    next(err);
  }
};

// Login existing user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.isOtpVerified) {
      const otpCode = "123456";
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
      
      console.log(`[DEVELOPMENT] Demo OTP for Login generated: ${otpCode}`);

      return res.status(200).json({
        success: true,
        userId: user._id,
        otpRequired: true,
        demoOtp: otpCode
      });
    }

    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const profile = user.toObject();
    delete profile.password;
    profile.id = profile._id;
    res.json({ token, refreshToken, profile });
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
    const profile = user.toObject();
    profile.id = profile._id;
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
};

export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ error: 'Missing userId or code' });
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.otpCode !== code && code !== "123456") {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }
    
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'OTP expired' });
    }
    
    user.isOtpVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    
    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    
    const profile = user.toObject();
    delete profile.password;
    profile.id = profile._id;
    
    res.status(200).json({
      success: true,
      message: "OTP verified",
      token,
      refreshToken,
      profile
    });
  } catch (err) {
    next(err);
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.isOtpVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }
    
    const otpCode = "123456";
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    
    console.log(`[DEVELOPMENT] Resend Demo OTP generated: ${otpCode}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      demoOtp: otpCode
    });
  } catch (err) {
    next(err);
  }
};
