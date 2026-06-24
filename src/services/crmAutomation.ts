import { UserModel } from '../models/User';
import { EmailService } from './emailService';

export class CrmAutomation {
  static async processAutomatedFollowUp() {
    const inactiveUsers = await UserModel.find({ status: 'ACTIVE', lastLogin: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    for (const user of inactiveUsers) {
      // Send automated email
      await EmailService.sendEmail(user.email, 'We miss you!', 'Log back in to catch up on the latest market trends.');
    }
  }
}
