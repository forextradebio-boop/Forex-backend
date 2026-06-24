import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { KycModel } from '../models/Kyc';
import { UserModel } from '../models/User';

export const submitKyc = async (req: Request, res: Response) => {
  try {
    const rawUserId = (req as any).user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const { documentType, documentNumber, fullName, dob, documents } = req.body;
    
    console.log(`[KYC POST] Received submission for user ${userId}. Body:`, req.body);
    
    let kyc = await KycModel.findOne({ userId });
    if (kyc) {
      kyc.documentType = documentType;
      kyc.documentNumber = documentNumber;
      kyc.fullName = fullName;
      kyc.dob = dob;
      kyc.documents = documents;
      kyc.status = 'PENDING';
      await kyc.save();
      console.log(`[KYC POST] Updated existing record:`, kyc._id);
    } else {
      kyc = await KycModel.create({
        userId,
        documentType,
        documentNumber,
        fullName,
        dob,
        documents,
        status: 'PENDING'
      });
      console.log(`[KYC POST] Created new record:`, kyc._id);
    }

    await UserModel.findByIdAndUpdate(userId, { kycStatus: 'PENDING' });
    
    res.json(kyc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
