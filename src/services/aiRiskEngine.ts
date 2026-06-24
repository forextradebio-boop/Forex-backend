import { WalletModel } from '../models/Wallet';

export class AiRiskEngine {
  static async evaluateUserRisk(userId: string) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return null;

    let riskScore = 0;
    if (wallet.marginLevel > 0 && wallet.marginLevel < 100) {
      riskScore += 50;
    }
    
    // Check abnormal losses logic here
    const status = riskScore > 80 ? 'CRITICAL' : riskScore > 50 ? 'HIGH' : 'LOW';
    return { userId, riskScore, status, recommendation: status === 'CRITICAL' ? 'Reduce position size' : 'Normal' };
  }
}
