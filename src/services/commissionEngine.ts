import { ReferralModel } from '../models/Referral';
import { IntroducingBrokerModel } from '../models/IntroducingBroker';
import { WalletModel } from '../models/Wallet';
import { TransactionModel } from '../models/Transaction';
import { NotificationModel } from '../models/Notification';

export class CommissionEngine {
  static async processTradeCommission(userId: string, volume: number) {
    // Basic commission rule: 1 standard lot = $5 commission distributed to upline
    const commissionPool = volume * 5; 

    // Find referrer
    const referral = await ReferralModel.findOne({ referredId: userId });
    if (referral) {
      const ib = await IntroducingBrokerModel.findOne({ userId: referral.referrerId });
      if (ib && ib.status === 'APPROVED') {
        const earned = commissionPool * (ib.revenueSharePercent / 100);
        ib.totalCommission += earned;
        await ib.save();

        const wallet = await WalletModel.findOne({ userId: ib.userId });
        if (wallet) {
          wallet.balance += earned;
          await wallet.save();

          await TransactionModel.create({
            userId: ib.userId,
            type: 'BONUS',
            amount: earned,
            balanceAfter: wallet.balance,
            description: 'IB Commission from trade'
          });

          await NotificationModel.create({
            userId: ib.userId,
            title: 'IB Commission Received',
            message: `You earned $${earned.toFixed(2)} from your referral's trading activity.`,
            type: 'SUCCESS'
          });
        }
      }
    }
  }

  static async processCopyTradeProfitShare(followerId: string, providerId: string, profit: number) {
    if (profit <= 0) return;

    const copyTrader = await CopyTraderModel.findOne({ followerId, providerId, status: 'ACTIVE' });
    if (copyTrader) {
      const share = profit * (copyTrader.profitSharePercent / 100);

      const followerWallet = await WalletModel.findOne({ userId: followerId });
      const providerWallet = await WalletModel.findOne({ userId: providerId });

      if (followerWallet && providerWallet) {
        followerWallet.balance -= share;
        providerWallet.balance += share;

        await followerWallet.save();
        await providerWallet.save();

        await TransactionModel.create({
          userId: followerId,
          type: 'TRADE_LOSS', // or FEE
          amount: -share,
          balanceAfter: followerWallet.balance,
          description: 'Copy Trade Profit Share deduction'
        });

        await TransactionModel.create({
          userId: providerId,
          type: 'BONUS',
          amount: share,
          balanceAfter: providerWallet.balance,
          description: 'Copy Trade Profit Share earned'
        });
      }
    }
  }
}

// Just importing CopyTraderModel here for simplicity
import { CopyTraderModel } from '../models/CopyTrader';
