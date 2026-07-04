import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { KycModel } from '../models/Kyc';
import { UserModel } from '../models/User';
import path from 'path';
import fs from 'fs';

export const submitKyc = async (req: Request, res: Response) => {
  try {
    console.log('[KYC POST] Request received');
    console.log('[KYC POST] Raw request body:', req.body);
    console.log('[KYC POST] User context:', (req as any).user);

    const rawUserId = (req as any).user?.id;
    if (!rawUserId) {
      console.error('[KYC POST] No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let userId;
    try {
      userId = new mongoose.Types.ObjectId(rawUserId);
      console.log('[KYC POST] Converted userId:', userId);
    } catch (err) {
      console.error('[KYC POST] ObjectId conversion failed:', err);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const { 
      aadharNumber, 
      aadharDocument, 
      panNumber, 
      panDocument,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId
    } = req.body;
    
    // Validate required fields
    const missingFields = [];
    if (!aadharNumber) missingFields.push('aadharNumber');
    if (!aadharDocument) missingFields.push('aadharDocument');
    if (!panNumber) missingFields.push('panNumber');
    if (!panDocument) missingFields.push('panDocument');
    if (!accountHolderName) missingFields.push('accountHolderName');
    if (!bankName) missingFields.push('bankName');
    if (!accountNumber) missingFields.push('accountNumber');
    if (!ifscCode) missingFields.push('ifscCode');

    if (missingFields.length > 0) {
      console.error('[KYC POST] Missing required fields:', missingFields);
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    console.log(`[KYC POST] Processing submission for user ${userId}`);
    
    let kyc = await KycModel.findOne({ userId });
    console.log('[KYC POST] Existing KYC record found:', kyc ? kyc._id : 'none');

    if (kyc) {
      console.log('[KYC POST] Updating existing KYC record:', kyc._id);
      
      const updatePayload = {
        aadharNumber,
        aadharDocument,
        panNumber,
        panDocument,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        upiId: upiId || null,
        status: 'PENDING'
      };
      
      console.log('[KYC POST] Update payload:', updatePayload);
      
      const updatedKyc = await KycModel.findByIdAndUpdate(
        kyc._id,
        { $set: updatePayload },
        { new: true, runValidators: true }
      );
      
      console.log('[KYC POST] After findByIdAndUpdate, result:', updatedKyc?.toObject());
      kyc = updatedKyc;
    } else {
      console.log('[KYC POST] Creating new KYC record');
      const kycData = {
        userId,
        aadharNumber,
        aadharDocument,
        panNumber,
        panDocument,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        upiId: upiId || null,
        documents: [],
        status: 'PENDING'
      };
      console.log('[KYC POST] KYC creation payload:', kycData);
      
      kyc = await KycModel.create(kycData);
      console.log(`[KYC POST] Successfully created KYC record:`, kyc._id);
      console.log('[KYC POST] Created data:', kyc.toObject());
    }

    console.log('[KYC POST] Updating user KYC status to PENDING');
    const updateResult = await UserModel.findByIdAndUpdate(
      userId, 
      { kycStatus: 'PENDING' },
      { new: true }
    );
    console.log('[KYC POST] User updated:', updateResult?._id);
    
    console.log('[KYC POST] Sending response');
    res.status(200).json({ 
      success: true,
      message: 'KYC submitted successfully',
      kyc: kyc.toObject()
    });
  } catch (error: any) {
    console.error('[KYC POST] Error occurred:', error);
    console.error('[KYC POST] Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to submit KYC',
      details: error.toString()
    });
  }
};

export const getKyc = async (req: Request, res: Response) => {
  try {
    const rawUserId = (req as any).user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);
    console.log(`[KYC GET] Request for user ${userId}`);
    
    let kyc = await KycModel.findOne({ userId });
    const user = await UserModel.findById(userId);
    
    // Fix mismatch: if user has a KYC status but KycModel is missing
    if (!kyc && user && user.kycStatus !== 'UNSUBMITTED') {
      console.log(`[KYC GET] Inconsistency: User has ${user.kycStatus} but no Kyc document found. Creating fallback.`);
      kyc = await KycModel.create({
        userId,
        status: user.kycStatus,
        documents: []
      });
    }

    if (kyc && user) {
      // Ensure KYC status is consistent across both models
      if (kyc.status !== user.kycStatus) {
        console.log(`[KYC GET] Status mismatch fixed: KycModel(${kyc.status}) -> UserModel(${user.kycStatus})`);
        kyc.status = user.kycStatus;
        await kyc.save();
      }
      
      console.log(`[KYC GET] Found record for user ${userId}: status ${kyc.status}`);
      res.json(kyc);
    } else {
      console.log(`[KYC GET] No record found for user ${userId}, returning UNSUBMITTED`);
      res.json({ status: 'UNSUBMITTED', documents: [] });
    }
  } catch (error: any) {
    console.error(`[KYC GET] Error:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Handle file uploads for KYC documents
export const uploadKycFiles = async (req: Request & { files?: any }, res: Response) => {
  try {
    // multer will populate req.files
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    // Build accessible URLs for saved files
    const baseUrl = process.env.UPLOAD_BASE_URL || '';
    const fileUrls = files.map((f: any) => {
      // Ensure forward slashes for URLs
      const rel = path.relative(path.join(process.cwd(), 'uploads'), f.path).split(path.sep).join('/');
      return baseUrl ? `${baseUrl}/uploads/${rel}` : `/uploads/${rel}`;
    });

    // If the request is authenticated, attach files to user's KYC document
    try {
      const rawUserId = (req as any).user?.id;
      if (rawUserId) {
        const userId = new mongoose.Types.ObjectId(rawUserId);
        let kyc = await KycModel.findOne({ userId });
        if (!kyc) {
          kyc = await KycModel.create({ userId, documents: fileUrls, status: 'PENDING' });
        } else {
          kyc.documents = [...(kyc.documents || []), ...fileUrls];
          kyc.status = 'PENDING';
          await kyc.save();
        }
        await UserModel.findByIdAndUpdate(userId, { kycStatus: 'PENDING' });
      }
    } catch (attachErr) {
      console.warn('Could not attach uploaded files to KYC record:', attachErr);
    }

    res.json({ success: true, files: fileUrls });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
