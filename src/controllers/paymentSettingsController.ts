import { Request, Response } from 'express';
import { PaymentSettingsModel } from '../models/PaymentSettings';
import path from 'path';
import fs from 'fs';

const buildUploadUrl = (filename: string) => {
  const baseUrl = process.env.UPLOAD_BASE_URL || process.env.API_BASE_URL || '';
  if (baseUrl) {
    const normalizedBase = baseUrl.replace(/\/$/, '');
    return `${normalizedBase}/uploads/${filename}`;
  }
  return `/api/uploads/${filename}`;
};

export const getPaymentSettings = async (req: Request, res: Response) => {
  try {
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create({});
    }

    if (settings.qrImage && settings.qrImage.startsWith('/uploads/')) {
      settings.qrImage = buildUploadUrl(settings.qrImage.replace('/uploads/', ''));
    }
    if (settings.qrCodeUrl && settings.qrCodeUrl.startsWith('/uploads/')) {
      settings.qrCodeUrl = buildUploadUrl(settings.qrCodeUrl.replace('/uploads/', ''));
    }

    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePaymentSettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if ((req as any).user && (req as any).user.id) {
      updates.updatedBy = (req as any).user.id;
    }

    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create(updates);
    } else {
      settings = await PaymentSettingsModel.findOneAndUpdate({}, { $set: updates }, { new: true });
    }
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const uploadQR = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const qrImageUrl = buildUploadUrl(req.file.filename);
    
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create({ qrImage: qrImageUrl });
    } else {
      // Optional: Delete old QR image from disk here to save space
      if (settings.qrImage && settings.qrImage.startsWith('/uploads/')) {
        const oldPath = path.join(process.cwd(), settings.qrImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      
      settings.qrImage = qrImageUrl;
      settings.qrCodeUrl = qrImageUrl; // For backward compatibility
      if ((req as any).user && (req as any).user.id) {
        settings.updatedBy = (req as any).user.id;
      }
      await settings.save();
    }
    
    res.json({ success: true, message: 'QR Image uploaded successfully', qrImage: qrImageUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteQR = async (req: Request, res: Response) => {
  try {
    let settings = await PaymentSettingsModel.findOne();
    if (settings) {
      if (settings.qrImage && settings.qrImage.startsWith('/uploads/')) {
        const oldPath = path.join(process.cwd(), settings.qrImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      
      settings.qrImage = '';
      settings.qrCodeUrl = '';
      if ((req as any).user && (req as any).user.id) {
        settings.updatedBy = (req as any).user.id;
      }
      await settings.save();
    }
    
    res.json({ success: true, message: 'QR Image deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
