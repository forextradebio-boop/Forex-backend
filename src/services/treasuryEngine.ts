export class TreasuryEngine {
  static async processInternalTransfer(fromUserId: string, toUserId: string, amount: number) {
    console.log(`Transferring ${amount} from ${fromUserId} to ${toUserId}`);
  }
}
